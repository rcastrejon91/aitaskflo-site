import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  name: string | null;
  first_seen: string;
  last_seen: string;
}

export interface DbConversation {
  id: string;
  user_id: string;
  summary: string | null;
  message_count: number;
  timestamp: string;
}

export interface DbFact {
  id: number;
  user_id: string;
  key: string;
  value: string;
  importance: number;
  tags: string;
  access_count: number;
  updated_at: string;
}

export interface DbCrmContact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Database singleton ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BetterSqlite3Db = any;

let _db: BetterSqlite3Db | null = null;
let _dbFailed = false;

function getDb(): BetterSqlite3Db | null {
  if (_dbFailed) return null;
  if (_db) return _db;

  try {
    const DATA_DIR = path.join(process.env.APP_DIR ?? process.cwd(/*turbopackIgnore: true*/), "data");
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const DB_PATH = path.join(DATA_DIR, "lyra.db");
    // Dynamic require keeps better-sqlite3 out of the module-load critical path
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
    return _db;
  } catch (err) {
    _dbFailed = true;
    console.error("[Lyra DB] SQLite unavailable — memory/CRM features disabled:", err instanceof Error ? err.message : err);
    return null;
  }
}

function initSchema(db: BetterSqlite3Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      name       TEXT,
      first_seen TEXT NOT NULL,
      last_seen  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      summary       TEXT,
      message_count INTEGER DEFAULT 0,
      timestamp     TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS facts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      TEXT NOT NULL,
      key          TEXT NOT NULL,
      value        TEXT NOT NULL,
      importance   INTEGER DEFAULT 3,
      tags         TEXT DEFAULT '',
      access_count INTEGER DEFAULT 0,
      updated_at   TEXT NOT NULL,
      UNIQUE(user_id, key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS crm_contacts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      phone      TEXT,
      email      TEXT,
      notes      TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_facts_user ON facts(user_id);
    CREATE INDEX IF NOT EXISTS idx_crm_name ON crm_contacts(name);

    CREATE TABLE IF NOT EXISTS auth_users (
      id         TEXT PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      name       TEXT,
      password_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);

    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT NOT NULL,
      title      TEXT NOT NULL,
      notes      TEXT,
      due_date   TEXT,
      completed  INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, completed);

    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id              TEXT PRIMARY KEY,
      plan                 TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id   TEXT,
      stripe_subscription_id TEXT,
      status               TEXT NOT NULL DEFAULT 'active',
      current_period_end   TEXT,
      updated_at           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage (
      user_id   TEXT NOT NULL,
      date      TEXT NOT NULL,
      count     INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, date)
    );
  `);

  // Add HOS (Hours of Service) trucking tables
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS hos_drivers (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        name        TEXT NOT NULL,
        cycle       TEXT NOT NULL DEFAULT '70hr8day',
        created_at  TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hos_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id   TEXT NOT NULL,
        status      TEXT NOT NULL,
        start_time  TEXT NOT NULL,
        end_time    TEXT,
        location    TEXT,
        notes       TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_hos_logs_driver ON hos_logs(driver_id, start_time DESC);
    `);
  } catch { /* ignore */ }

  // Add google_tokens table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS google_tokens (
        user_id      TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at   TEXT NOT NULL,
        scopes       TEXT,
        updated_at   TEXT NOT NULL
      );
    `);
  } catch { /* ignore */ }

  // Add marketplace_games and game_ratings tables
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS marketplace_games (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        slug          TEXT UNIQUE NOT NULL,
        title         TEXT NOT NULL,
        genre         TEXT NOT NULL DEFAULT 'unknown',
        engine        TEXT NOT NULL DEFAULT 'godot2d',
        concept       TEXT,
        thumbnail_url TEXT,
        play_count    INTEGER DEFAULT 0,
        avg_rating    REAL DEFAULT 0,
        rating_count  INTEGER DEFAULT 0,
        hidden        INTEGER DEFAULT 0,
        featured      INTEGER DEFAULT 0,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS game_ratings (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        game_slug        TEXT NOT NULL,
        user_fingerprint TEXT NOT NULL,
        stars            INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
        created_at       TEXT NOT NULL,
        UNIQUE(game_slug, user_fingerprint),
        FOREIGN KEY (game_slug) REFERENCES marketplace_games(slug)
      );
      CREATE INDEX IF NOT EXISTS idx_marketplace_trending ON marketplace_games(play_count DESC, avg_rating DESC);
      CREATE INDEX IF NOT EXISTS idx_marketplace_newest ON marketplace_games(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_game_ratings_slug ON game_ratings(game_slug);

      CREATE TABLE IF NOT EXISTS computer_sessions (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        task        TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'pending',
        screenshot  TEXT,
        action      TEXT,
        result      TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
    `);
  } catch { /* ignore */ }

  // Migrate existing facts table to add new columns if they don't exist
  try {
    db.exec(`ALTER TABLE facts ADD COLUMN importance INTEGER DEFAULT 3`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE facts ADD COLUMN tags TEXT DEFAULT ''`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE facts ADD COLUMN access_count INTEGER DEFAULT 0`);
  } catch { /* column already exists */ }
  // Create index after migration so importance column is guaranteed to exist
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_facts_importance ON facts(user_id, importance DESC)`);
  } catch { /* ignore */ }

  // ── Skill Library (additive) ───────────────────────────────────────────────
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL UNIQUE,
        description  TEXT NOT NULL,
        instructions TEXT NOT NULL DEFAULT '',
        resources    TEXT NOT NULL DEFAULT '',
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        usage_count  INTEGER NOT NULL DEFAULT 0,
        success_rate REAL NOT NULL DEFAULT 0.0,
        created_by   TEXT NOT NULL DEFAULT 'lyra',
        status       TEXT NOT NULL DEFAULT 'active',
        test_score   TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_skills_name   ON skills(name);
      CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);

      CREATE TABLE IF NOT EXISTS skill_files (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id   TEXT NOT NULL,
        level      INTEGER NOT NULL,
        filename   TEXT NOT NULL,
        content    TEXT NOT NULL,
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
      );
    `);
  } catch { /* ignore */ }

  // ── Dual Memory (additive) ─────────────────────────────────────────────────
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ideation_memory (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        task        TEXT NOT NULL,
        approaches  TEXT NOT NULL DEFAULT '[]',
        decided_not TEXT NOT NULL DEFAULT '[]',
        reasoning   TEXT NOT NULL DEFAULT '',
        created_at  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ideation_user ON ideation_memory(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS execution_memory (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL,
        task            TEXT NOT NULL,
        tool_sequence   TEXT NOT NULL DEFAULT '[]',
        outcome         TEXT NOT NULL DEFAULT '',
        success         INTEGER NOT NULL DEFAULT 1,
        skill_used      TEXT,
        duration_ms     INTEGER,
        created_at      TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_execution_user ON execution_memory(user_id, created_at DESC);
    `);
  } catch { /* ignore */ }

  // ── Agent Job Queue (additive) ─────────────────────────────────────────────
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_jobs (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL,
        task            TEXT NOT NULL,
        assigned_agent  TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending',
        result          TEXT,
        confidence      TEXT NOT NULL DEFAULT 'high',
        checkpoint      TEXT,
        iteration       INTEGER NOT NULL DEFAULT 0,
        reflection      TEXT,
        resume_attempts INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_user   ON agent_jobs(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON agent_jobs(status, created_at DESC);
    `);
  } catch { /* ignore */ }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function upsertUser(id: string, name?: string): DbUser | null {
  const db = getDb();
  if (!db) return null;
  try {
    const now = new Date().toISOString();
    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
    if (existing) {
      db.prepare("UPDATE users SET last_seen = ?, name = COALESCE(?, name) WHERE id = ?").run(now, name ?? null, id);
      return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
    }
    db.prepare("INSERT INTO users (id, name, first_seen, last_seen) VALUES (?, ?, ?, ?)").run(id, name ?? null, now, now);
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
  } catch (err) {
    console.error("[Lyra DB] upsertUser error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function getUser(id: string): DbUser | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser) ?? null;
  } catch {
    return null;
  }
}

// ── Facts ─────────────────────────────────────────────────────────────────────

// Score importance 1-5 without an API call — fast keyword heuristic
function scoreImportance(key: string, value: string): number {
  const text = `${key} ${value}`.toLowerCase();
  // Critical: names, clients, projects, preferences that shape every response
  if (/\b(client|customer|project|business|company|owner|founder|ceo|product|app|startup|partner)\b/.test(text)) return 5;
  if (/\b(name|called|i am|i'm|my name)\b/.test(text)) return 5;
  if (/\b(always|never|hate|love|prefer|important|critical|must|need)\b/.test(text)) return 4;
  if (/\b(like|dislike|enjoy|use|work|build|create|making)\b/.test(text)) return 3;
  if (/\b(maybe|sometimes|usually|often|think|feel)\b/.test(text)) return 2;
  if (/\b(lol|ok|yeah|sure|hmm|cool)\b/.test(text)) return 1;
  return 3;
}

// Extract semantic tags from a fact for better retrieval
function extractTags(key: string, value: string): string {
  const text = `${key} ${value}`.toLowerCase();
  const tags: string[] = [];
  if (/\b(client|customer|lead|contact)\b/.test(text)) tags.push("crm");
  if (/\b(code|build|app|project|software|game|dev)\b/.test(text)) tags.push("tech");
  if (/\b(email|message|contact|call|meeting)\b/.test(text)) tags.push("communication");
  if (/\b(like|prefer|love|hate|want|need)\b/.test(text)) tags.push("preference");
  if (/\b(name|called|i am)\b/.test(text)) tags.push("identity");
  if (/\b(business|company|startup|product)\b/.test(text)) tags.push("business");
  return tags.join(",");
}

export function upsertFact(userId: string, key: string, value: string, importanceOverride?: number): void {
  const db = getDb();
  if (!db) return;
  try {
    const now = new Date().toISOString();
    const importance = importanceOverride ?? scoreImportance(key, value);
    if (importance < 1) return; // discard noise
    const tags = extractTags(key, value);
    db.prepare(
      `INSERT INTO facts (user_id, key, value, importance, tags, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, importance = MAX(importance, excluded.importance), tags = excluded.tags, updated_at = excluded.updated_at`
    ).run(userId, key.toLowerCase().trim(), value, importance, tags, now);
  } catch (err) {
    console.error("[Lyra DB] upsertFact error:", err instanceof Error ? err.message : err);
  }
}

export function getFacts(userId: string, limit = 30): DbFact[] {
  const db = getDb();
  if (!db) return [];
  try {
    // Return highest importance first, then most recent
    return db.prepare(
      "SELECT * FROM facts WHERE user_id = ? ORDER BY importance DESC, updated_at DESC LIMIT ?"
    ).all(userId, limit) as DbFact[];
  } catch {
    return [];
  }
}

// Semantic search — finds facts relevant to a query using word overlap
export function searchFacts(userId: string, query: string, limit = 10): DbFact[] {
  const db = getDb();
  if (!db) return [];
  try {
    const all = db.prepare(
      "SELECT * FROM facts WHERE user_id = ? ORDER BY importance DESC"
    ).all(userId) as DbFact[];

    if (!query.trim()) return all.slice(0, limit);

    const queryWords = new Set(
      query.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
    );

    // Score each fact by word overlap with query
    const scored = all.map((f) => {
      const factWords = new Set(
        `${f.key} ${f.value} ${f.tags ?? ""}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
      );
      const overlap = [...queryWords].filter((w) => factWords.has(w)).length;
      const score = overlap * 2 + f.importance;
      // Bump access count for retrieved facts
      return { fact: f, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.fact);
  } catch {
    return [];
  }
}

// Compress old low-importance facts when user has too many
export async function compressMemoriesIfNeeded(userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    const count = (db.prepare("SELECT COUNT(*) as c FROM facts WHERE user_id = ?").get(userId) as { c: number }).c;
    if (count < 50) return; // only compress when we have a lot

    const lowImportance = db.prepare(
      "SELECT * FROM facts WHERE user_id = ? AND importance <= 2 ORDER BY updated_at ASC LIMIT 20"
    ).all(userId) as DbFact[];

    if (lowImportance.length < 10) return;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      // No LLM available — just delete the oldest low-importance facts
      const ids = lowImportance.map((f) => f.id);
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`DELETE FROM facts WHERE id IN (${placeholders})`).run(...ids);
      return;
    }

    // Use Groq to compress multiple facts into fewer dense facts
    const factsList = lowImportance.map((f) => `${f.key}: ${f.value}`).join("\n");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 200,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Compress these user facts into 2-3 dense summary facts. Keep only what's actually useful to know about this person. Return ONLY a JSON array like [{"key":"summary topic","value":"compressed fact"}].

Facts:
${factsList}`,
        }],
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (res.ok) {
      const data = await res.json();
      const text: string = data.choices?.[0]?.message?.content ?? "[]";
      const compressed = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]") as Array<{ key: string; value: string }>;

      // Delete old facts, store compressed ones
      const ids = lowImportance.map((f) => f.id);
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`DELETE FROM facts WHERE id IN (${placeholders})`).run(...ids);

      for (const f of compressed) {
        if (f.key && f.value) upsertFact(userId, `compressed: ${f.key}`, f.value, 3);
      }
    }
  } catch (err) {
    console.error("[Lyra DB] compressMemories error:", err instanceof Error ? err.message : err);
  }
}

// Extract and store facts from a conversation message automatically
export async function extractAndStoreFacts(userId: string, userMessage: string, assistantReply: string): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || !userMessage.trim()) return;

  // Skip short/trivial messages
  if (userMessage.length < 10) return;
  const trivial = /^(hi|hey|hello|ok|yes|no|thanks|lol|haha|cool|nice|ok|sure|yep|nope|bye)$/i;
  if (trivial.test(userMessage.trim())) return;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 150,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Extract facts about the user from this message. Only extract real, persistent facts — not temporary things or questions. Return ONLY a JSON array or empty array [].

Format: [{"key":"fact category","value":"the fact","importance":1-5}]
Importance: 5=critical (name, business, clients), 4=strong preference, 3=general preference, 2=minor, 1=trivial

User message: "${userMessage.slice(0, 400)}"

JSON array only:`,
        }],
      }),
      signal: AbortSignal.timeout(4_000),
    });

    if (!res.ok) return;
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "[]";
    const facts = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]") as Array<{ key: string; value: string; importance?: number }>;

    for (const f of facts) {
      if (f.key && f.value && typeof f.value === "string") {
        upsertFact(userId, f.key, f.value, f.importance);
      }
    }

    // Compress if needed (async, non-blocking)
    compressMemoriesIfNeeded(userId).catch(() => {});
  } catch {
    // Non-critical — fail silently
  }
}

// ── Conversations ─────────────────────────────────────────────────────────────

export function saveConversation(id: string, userId: string, summary: string, messageCount: number): void {
  const db = getDb();
  if (!db) return;
  try {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO conversations (id, user_id, summary, message_count, timestamp) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET summary = excluded.summary, message_count = excluded.message_count, timestamp = excluded.timestamp`
    ).run(id, userId, summary, messageCount, now);
  } catch (err) {
    console.error("[Lyra DB] saveConversation error:", err instanceof Error ? err.message : err);
  }
}

export function getRecentConversations(userId: string, limit = 5): DbConversation[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?"
    ).all(userId, limit) as DbConversation[];
  } catch {
    return [];
  }
}

// ── CRM ───────────────────────────────────────────────────────────────────────

export function upsertCrmContact(name: string, phone?: string, email?: string, notes?: string): DbCrmContact {
  const db = getDb();
  const now = new Date().toISOString();

  // Fallback stub when DB is unavailable
  if (!db) return { id: 0, name, phone: phone ?? null, email: email ?? null, notes: notes ?? null, created_at: now, updated_at: now };

  try {
    const existing = db.prepare("SELECT * FROM crm_contacts WHERE LOWER(name) = LOWER(?)").get(name) as DbCrmContact | undefined;
    if (existing) {
      const newNotes = notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes;
      db.prepare(
        `UPDATE crm_contacts SET phone = COALESCE(?, phone), email = COALESCE(?, email), notes = ?, updated_at = ? WHERE id = ?`
      ).run(phone ?? null, email ?? null, newNotes, now, existing.id);
      return db.prepare("SELECT * FROM crm_contacts WHERE id = ?").get(existing.id) as DbCrmContact;
    }
    const result = db.prepare(
      "INSERT INTO crm_contacts (name, phone, email, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(name, phone ?? null, email ?? null, notes ?? null, now, now);
    return db.prepare("SELECT * FROM crm_contacts WHERE id = ?").get(result.lastInsertRowid) as DbCrmContact;
  } catch (err) {
    console.error("[Lyra DB] upsertCrmContact error:", err instanceof Error ? err.message : err);
    return { id: 0, name, phone: phone ?? null, email: email ?? null, notes: notes ?? null, created_at: now, updated_at: now };
  }
}

export function searchCrmContacts(query?: string): DbCrmContact[] {
  const db = getDb();
  if (!db) return [];
  try {
    if (!query?.trim()) return db.prepare("SELECT * FROM crm_contacts ORDER BY name").all() as DbCrmContact[];
    const q = `%${query.toLowerCase()}%`;
    return db.prepare(
      `SELECT * FROM crm_contacts WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(notes) LIKE ? ORDER BY name`
    ).all(q, q, q, q) as DbCrmContact[];
  } catch {
    return [];
  }
}

export function deleteCrmContact(nameOrId: string): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const byId = db.prepare("DELETE FROM crm_contacts WHERE id = ?").run(parseInt(nameOrId, 10));
    if (byId.changes > 0) return true;
    const byName = db.prepare("DELETE FROM crm_contacts WHERE LOWER(name) = LOWER(?)").run(nameOrId);
    return byName.changes > 0;
  } catch {
    return false;
  }
}

// ── Auth Users ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  created_at: string;
}

export function getAuthUserByEmail(email: string): AuthUser | null {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare("SELECT * FROM auth_users WHERE LOWER(email) = LOWER(?)").get(email) as AuthUser | null;
  } catch { return null; }
}

export function getAuthUserByUsernameOrEmail(login: string): AuthUser | null {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare(
      "SELECT * FROM auth_users WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)"
    ).get(login, login) as AuthUser | null;
  } catch { return null; }
}

export function getAuthUserById(id: string): AuthUser | null {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare("SELECT * FROM auth_users WHERE id = ?").get(id) as AuthUser | null;
  } catch { return null; }
}

export function createAuthUser(email: string, name: string | null, passwordHash: string | null): AuthUser {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO auth_users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(id, email, name, passwordHash, now);
  return db.prepare("SELECT * FROM auth_users WHERE id = ?").get(id) as AuthUser;
}

export function updateAuthUserPassword(userId: string, newPasswordHash: string): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const r = db.prepare("UPDATE auth_users SET password_hash = ? WHERE id = ?").run(newPasswordHash, userId);
    return r.changes > 0;
  } catch (err) {
    console.error("[Lyra DB] updateAuthUserPassword error:", err instanceof Error ? err.message : err);
    return false;
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface DbTask {
  id: number;
  user_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  completed: number;
  created_at: string;
  updated_at: string;
}

export function createTask(userId: string, title: string, notes?: string, dueDate?: string): DbTask {
  const db = getDb();
  const now = new Date().toISOString();
  if (!db) return { id: 0, user_id: userId, title, notes: notes ?? null, due_date: dueDate ?? null, completed: 0, created_at: now, updated_at: now };
  try {
    const result = db.prepare("INSERT INTO tasks (user_id, title, notes, due_date, completed, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)").run(userId, title, notes ?? null, dueDate ?? null, now, now);
    return db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid) as DbTask;
  } catch (err) {
    console.error("[Lyra DB] createTask error:", err instanceof Error ? err.message : err);
    return { id: 0, user_id: userId, title, notes: notes ?? null, due_date: dueDate ?? null, completed: 0, created_at: now, updated_at: now };
  }
}

export function listTasks(userId: string, includeCompleted = false): DbTask[] {
  const db = getDb();
  if (!db) return [];
  try {
    if (includeCompleted) return db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC").all(userId) as DbTask[];
    return db.prepare("SELECT * FROM tasks WHERE user_id = ? AND completed = 0 ORDER BY created_at DESC").all(userId) as DbTask[];
  } catch { return []; }
}

export function completeTask(userId: string, taskId: number): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const r = db.prepare("UPDATE tasks SET completed = 1, updated_at = ? WHERE id = ? AND user_id = ?").run(new Date().toISOString(), taskId, userId);
    return r.changes > 0;
  } catch { return false; }
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export interface DbSubscription {
  user_id: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
  updated_at: string;
}

export function getSubscription(userId: string): DbSubscription {
  const db = getDb();
  const now = new Date().toISOString();
  const free: DbSubscription = { user_id: userId, plan: "free", stripe_customer_id: null, stripe_subscription_id: null, status: "active", current_period_end: null, updated_at: now };
  // Admin accounts are always pro
  if (userId === "admin-1" || userId?.startsWith("admin-")) {
    return { ...free, plan: "pro" };
  }
  if (!db) return free;
  try {
    return (db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(userId) as DbSubscription) ?? free;
  } catch { return free; }
}

export function upsertSubscription(data: Partial<DbSubscription> & { user_id: string }): void {
  const db = getDb();
  if (!db) return;
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO subscriptions (user_id, plan, stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at)
      VALUES (@user_id, @plan, @stripe_customer_id, @stripe_subscription_id, @status, @current_period_end, @updated_at)
      ON CONFLICT(user_id) DO UPDATE SET
        plan = COALESCE(@plan, plan),
        stripe_customer_id = COALESCE(@stripe_customer_id, stripe_customer_id),
        stripe_subscription_id = COALESCE(@stripe_subscription_id, stripe_subscription_id),
        status = COALESCE(@status, status),
        current_period_end = COALESCE(@current_period_end, current_period_end),
        updated_at = @updated_at
    `).run({ plan: "free", stripe_customer_id: null, stripe_subscription_id: null, status: "active", current_period_end: null, ...data, updated_at: now });
  } catch (err) {
    console.error("[Lyra DB] upsertSubscription error:", err instanceof Error ? err.message : err);
  }
}

// ── Usage tracking ─────────────────────────────────────────────────────────────

export function getTodayUsage(userId: string): number {
  const db = getDb();
  if (!db) return 0;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const row = db.prepare("SELECT count FROM usage WHERE user_id = ? AND date = ?").get(userId, today) as { count: number } | undefined;
    return row?.count ?? 0;
  } catch { return 0; }
}

export function incrementUsage(userId: string): number {
  const db = getDb();
  if (!db) return 0;
  try {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`
      INSERT INTO usage (user_id, date, count) VALUES (?, ?, 1)
      ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1
    `).run(userId, today);
    return getTodayUsage(userId);
  } catch { return 0; }
}

// ── Memory context builder ────────────────────────────────────────────────────

export function buildMemoryContext(userId: string, currentMessage?: string): string {
  try {
    const user = getUser(userId);
    if (!user) return "";

    // Use semantic search if we have a current message, else return top by importance
    const facts = currentMessage
      ? searchFacts(userId, currentMessage, 15)
      : getFacts(userId, 15);

    const conversations = getRecentConversations(userId, 3);

    const parts: string[] = ["\n\n--- MEMORY CONTEXT ---"];
    if (user.name) parts.push(`User name: ${user.name}`);
    parts.push(`First seen: ${user.first_seen.split("T")[0]} | Last seen: ${user.last_seen.split("T")[0]}`);

    if (facts.length > 0) {
      // Group by importance
      const critical = facts.filter((f) => (f.importance ?? 3) >= 4);
      const general  = facts.filter((f) => (f.importance ?? 3) < 4);

      if (critical.length > 0) {
        parts.push("\nKey facts (high importance):");
        critical.forEach((f) => parts.push(`  • ${f.key}: ${f.value}`));
      }
      if (general.length > 0) {
        parts.push("\nOther known facts:");
        general.forEach((f) => parts.push(`  • ${f.key}: ${f.value}`));
      }
    }

    if (conversations.length > 0) {
      parts.push("\nRecent conversations:");
      conversations.forEach((c) => { if (c.summary) parts.push(`  • [${c.timestamp.split("T")[0]}] ${c.summary}`); });
    }

    parts.push("--- END MEMORY ---");
    return parts.join("\n");
  } catch {
    return "";
  }
}

// ── Google Tokens ─────────────────────────────────────────────────────────────

export interface DbGoogleTokens {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scopes: string | null;
  updated_at: string;
}

export function saveGoogleTokens(userId: string, data: { access_token: string; refresh_token?: string | null; expires_at: string; scopes?: string | null }): void {
  const db = getDb();
  if (!db) return;
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO google_tokens (user_id, access_token, refresh_token, expires_at, scopes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, refresh_token),
        expires_at = excluded.expires_at,
        scopes = COALESCE(excluded.scopes, scopes),
        updated_at = excluded.updated_at
    `).run(userId, data.access_token, data.refresh_token ?? null, data.expires_at, data.scopes ?? null, now);
  } catch (err) {
    console.error("[Lyra DB] saveGoogleTokens error:", err instanceof Error ? err.message : err);
  }
}

export function getGoogleTokens(userId: string): DbGoogleTokens | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare("SELECT * FROM google_tokens WHERE user_id = ?").get(userId) as DbGoogleTokens) ?? null;
  } catch {
    return null;
  }
}

// ── Marketplace Games ──────────────────────────────────────────────────────────

export interface MarketplaceGame {
  id: number;
  slug: string;
  title: string;
  genre: string;
  engine: string;
  concept: string | null;
  thumbnail_url: string | null;
  play_count: number;
  avg_rating: number;
  rating_count: number;
  hidden: number;
  featured: number;
  created_at: string;
  updated_at: string;
}

export function saveMarketplaceGame(game: {
  slug: string;
  title: string;
  genre: string;
  engine: string;
  concept?: string;
  thumbnail_url?: string;
}): MarketplaceGame | null {
  const db = getDb();
  if (!db) return null;
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO marketplace_games (slug, title, genre, engine, concept, thumbnail_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        genre = excluded.genre,
        engine = excluded.engine,
        concept = COALESCE(excluded.concept, concept),
        thumbnail_url = COALESCE(excluded.thumbnail_url, thumbnail_url),
        updated_at = excluded.updated_at
    `).run(game.slug, game.title, game.genre, game.engine, game.concept ?? null, game.thumbnail_url ?? null, now, now);
    return (db.prepare("SELECT * FROM marketplace_games WHERE slug = ?").get(game.slug) as MarketplaceGame) ?? null;
  } catch (err) {
    console.error("[Lyra DB] saveMarketplaceGame error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function getMarketplaceGame(slug: string): MarketplaceGame | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare("SELECT * FROM marketplace_games WHERE slug = ?").get(slug) as MarketplaceGame) ?? null;
  } catch {
    return null;
  }
}

export function listMarketplaceGames(sort: "trending" | "newest" | "top_rated" = "trending", limit = 50): MarketplaceGame[] {
  const db = getDb();
  if (!db) return [];
  try {
    const orderBy = sort === "newest"
      ? "created_at DESC"
      : sort === "top_rated"
      ? "avg_rating DESC, rating_count DESC"
      : "(play_count * 0.6 + avg_rating * rating_count * 0.4) DESC";
    return db.prepare(`SELECT * FROM marketplace_games WHERE hidden = 0 ORDER BY ${orderBy} LIMIT ?`).all(limit) as MarketplaceGame[];
  } catch {
    return [];
  }
}

export function incrementPlayCount(slug: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare("UPDATE marketplace_games SET play_count = play_count + 1, updated_at = ? WHERE slug = ?")
      .run(new Date().toISOString(), slug);
  } catch { /* ignore */ }
}

export function rateGame(slug: string, fingerprint: string, stars: number): { avg_rating: number; rating_count: number } | null {
  const db = getDb();
  if (!db) return null;
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO game_ratings (game_slug, user_fingerprint, stars, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(game_slug, user_fingerprint) DO UPDATE SET stars = excluded.stars
    `).run(slug, fingerprint, stars, now);
    // Recalculate avg
    const stats = db.prepare("SELECT AVG(stars) as avg, COUNT(*) as cnt FROM game_ratings WHERE game_slug = ?").get(slug) as { avg: number; cnt: number };
    db.prepare("UPDATE marketplace_games SET avg_rating = ?, rating_count = ?, updated_at = ? WHERE slug = ?")
      .run(Math.round(stats.avg * 10) / 10, stats.cnt, now, slug);
    return { avg_rating: Math.round(stats.avg * 10) / 10, rating_count: stats.cnt };
  } catch (err) {
    console.error("[Lyra DB] rateGame error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function getUserRating(slug: string, fingerprint: string): number | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.prepare("SELECT stars FROM game_ratings WHERE game_slug = ? AND user_fingerprint = ?").get(slug, fingerprint) as { stars: number } | undefined;
    return row?.stars ?? null;
  } catch {
    return null;
  }
}

export function setGameHidden(slug: string, hidden: boolean): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare("UPDATE marketplace_games SET hidden = ?, updated_at = ? WHERE slug = ?")
      .run(hidden ? 1 : 0, new Date().toISOString(), slug);
  } catch { /* ignore */ }
}

export function setGameFeatured(slug: string, featured: boolean): void {
  const db = getDb();
  if (!db) return;
  try {
    // Ensure column exists (migration for existing DBs)
    try { db.exec("ALTER TABLE marketplace_games ADD COLUMN featured INTEGER DEFAULT 0"); } catch { /* already exists */ }
    // Only one featured game at a time — clear existing first
    if (featured) db.prepare("UPDATE marketplace_games SET featured = 0").run();
    db.prepare("UPDATE marketplace_games SET featured = ?, updated_at = ? WHERE slug = ?")
      .run(featured ? 1 : 0, new Date().toISOString(), slug);
  } catch { /* ignore */ }
}

export function getFeaturedGame(): MarketplaceGame | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare("SELECT * FROM marketplace_games WHERE featured = 1 AND hidden = 0 LIMIT 1").get() as MarketplaceGame) ?? null;
  } catch {
    return null;
  }
}

// ── Computer control sessions ─────────────────────────────────────────────────

export interface ComputerSession {
  id: string;
  user_id: string;
  task: string;
  status: "pending" | "running" | "waiting_screenshot" | "done" | "error";
  screenshot: string | null;
  action: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

export function createComputerSession(userId: string, task: string): string {
  const db = getDb();
  if (!db) throw new Error("DB unavailable");
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO computer_sessions (id, user_id, task, status, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?)"
  ).run(id, userId, task, now, now);
  return id;
}

export function getComputerSession(id: string): ComputerSession | null {
  const db = getDb();
  if (!db) return null;
  try { return db.prepare("SELECT * FROM computer_sessions WHERE id = ?").get(id) as ComputerSession | null; }
  catch { return null; }
}

export function getPendingComputerSession(userId: string): ComputerSession | null {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare(
      "SELECT * FROM computer_sessions WHERE user_id = ? AND status IN ('pending','running','waiting_screenshot') ORDER BY created_at DESC LIMIT 1"
    ).get(userId) as ComputerSession | null;
  } catch { return null; }
}

export function updateComputerSession(id: string, fields: Partial<ComputerSession>): void {
  const db = getDb();
  if (!db) return;
  const now = new Date().toISOString();
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(", ");
  const vals = [...Object.values(fields), now, id];
  try { db.prepare(`UPDATE computer_sessions SET ${sets}, updated_at = ? WHERE id = ?`).run(...vals); }
  catch { /* ignore */ }
}
