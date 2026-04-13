import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  name: string | null;
  first_seen: string;
  last_seen: string;
  interests: string | null;        // JSON: string[] of topic tags
  interest_weights: string | null; // JSON: Record<string, number> tag → cumulative weight
  manual_interests: string | null; // JSON: string[] user-added interest tags
  tone_preference: string | null;  // free text: how user wants Lyra to sound
  avoid_topics: string | null;     // free text: things Lyra should avoid
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

export function getDb(): BetterSqlite3Db | null {
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

    CREATE TABLE IF NOT EXISTS search_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT,
      query      TEXT NOT NULL,
      results    INTEGER DEFAULT 0,
      searched_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at DESC);

    CREATE TABLE IF NOT EXISTS personas (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      vibe_id         TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'bootstrapping',
      ai_disclosed    INTEGER NOT NULL DEFAULT 1,
      hero_image_url  TEXT,
      hero_seed       INTEGER,
      hero_prompt     TEXT,
      hero_embedding  TEXT,
      lora_url        TEXT,
      lora_trigger    TEXT,
      training_images TEXT,
      similarity_avg  REAL,
      welcome_dm      TEXT,
      created_at      TEXT NOT NULL,
      locked_at       TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_personas_status ON personas(status);

    CREATE TABLE IF NOT EXISTS blocked_ips (
      ip          TEXT PRIMARY KEY,
      reason      TEXT NOT NULL,
      blocked_by  TEXT DEFAULT 'lyra',
      cf_rule_id  TEXT,
      blocked_at  TEXT NOT NULL,
      expires_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      ip          TEXT,
      user_id     TEXT,
      details     TEXT,
      severity    TEXT DEFAULT 'medium',
      resolved    INTEGER DEFAULT 0,
      occurred_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_security_events_time ON security_events(occurred_at DESC);

    CREATE TABLE IF NOT EXISTS suspended_users (
      user_id     TEXT PRIMARY KEY,
      reason      TEXT NOT NULL,
      suspended_by TEXT DEFAULT 'lyra',
      suspended_at TEXT NOT NULL,
      expires_at  TEXT
    );

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

  // Migrate users table — interests columns (additive)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN interests TEXT`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN interest_weights TEXT`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN manual_interests TEXT`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN tone_preference TEXT`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN avoid_topics TEXT`);
  } catch { /* column already exists */ }

  // Semantic embeddings table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_embeddings (
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        content     TEXT NOT NULL,
        embedding   TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        PRIMARY KEY (entity_type, entity_id)
      )
    `);
  } catch { /* ignore */ }

  // Response feedback table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_feedback (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id           TEXT NOT NULL,
        rating            INTEGER NOT NULL,
        user_message      TEXT NOT NULL,
        assistant_message TEXT NOT NULL,
        created_at        TEXT NOT NULL
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_feedback_user ON lyra_feedback(user_id, created_at DESC)`);
  } catch { /* ignore */ }

  // Message store for training data
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_messages (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        user_message    TEXT NOT NULL,
        assistant_message TEXT NOT NULL,
        model           TEXT DEFAULT 'claude-sonnet-4-6',
        created_at      TEXT NOT NULL
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_user ON lyra_messages(user_id, created_at DESC)`);
  } catch { /* ignore */ }

  // lyra_books — bookshelf persistence
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_books (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        type        TEXT NOT NULL DEFAULT 'book',
        title       TEXT NOT NULL,
        subtitle    TEXT,
        author      TEXT,
        genre       TEXT,
        description TEXT,
        cover_url   TEXT,
        content     TEXT NOT NULL,
        pdf_path    TEXT,
        word_count  INTEGER DEFAULT 0,
        created_at  TEXT NOT NULL
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_books_user ON lyra_books(user_id, created_at DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_books_type ON lyra_books(user_id, type)`);
  } catch { /* ignore */ }

  // lyra_skills — self-written skills and dynamic tools
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_skills (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        type        TEXT NOT NULL DEFAULT 'skill',
        status      TEXT NOT NULL DEFAULT 'pending',
        content     TEXT NOT NULL,
        uses        INTEGER DEFAULT 0,
        successes   INTEGER DEFAULT 0,
        created_at  TEXT NOT NULL,
        last_used   TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_skill_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_name TEXT NOT NULL,
        success    INTEGER NOT NULL DEFAULT 1,
        note       TEXT,
        used_at    TEXT NOT NULL
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_skills_name ON lyra_skills(name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_skills_status ON lyra_skills(status)`);
  } catch { /* ignore */ }

  // lyra_experiments — AI research lab
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_experiments (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        type         TEXT NOT NULL,
        title        TEXT NOT NULL,
        hypothesis   TEXT,
        status       TEXT NOT NULL DEFAULT 'running',
        result       TEXT,
        log          TEXT,
        metadata     TEXT,
        created_at   TEXT NOT NULL,
        finished_at  TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_exp_user ON lyra_experiments(user_id, created_at DESC)`);
  } catch { /* ignore */ }

  // Add game_content column to marketplace_games (stores browser game HTML inline)
  try { db.exec(`ALTER TABLE marketplace_games ADD COLUMN game_content TEXT`); } catch { /* already exists */ }

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

  // ── Daily Drops (additive) ─────────────────────────────────────────────────
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_drops (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        content     TEXT NOT NULL,
        type        TEXT NOT NULL DEFAULT 'concept',
        delivered   INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_drops_user ON lyra_drops(user_id, delivered, created_at DESC);
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

// ── Message persistence (training data) ──────────────────────────────────────

export function saveMessage(
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
  model = "claude-sonnet-4-6"
): void {
  const db = getDb();
  if (!db) return;
  // Skip trivially short exchanges
  if (userMessage.trim().length < 5 || assistantMessage.trim().length < 20) return;
  try {
    db.prepare(`
      INSERT INTO lyra_messages (user_id, conversation_id, user_message, assistant_message, model, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, conversationId, userMessage.slice(0, 4000), assistantMessage.slice(0, 8000), model, new Date().toISOString());
  } catch { /* ignore */ }
}

export function getMessages(userId?: string, limit = 500): Array<{
  id: number; user_id: string; conversation_id: string;
  user_message: string; assistant_message: string; model: string; created_at: string;
}> {
  const db = getDb();
  if (!db) return [];
  try {
    if (userId) {
      return db.prepare("SELECT * FROM lyra_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").all(userId, limit) as ReturnType<typeof getMessages>;
    }
    return db.prepare("SELECT * FROM lyra_messages ORDER BY created_at DESC LIMIT ?").all(limit) as ReturnType<typeof getMessages>;
  } catch { return []; }
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

    // Inject top interests if available
    if (user.interest_weights) {
      try {
        const weights = JSON.parse(user.interest_weights) as Record<string, number>;
        const topInterests = Object.entries(weights)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([tag]) => tag);
        if (topInterests.length > 0) {
          parts.push(`\nUser's known interests (most frequent first): ${topInterests.join(", ")}`);
        }
      } catch { /* ignore malformed JSON */ }
    }

    // Inject manual preferences if set
    if (user.manual_interests) {
      try {
        const tags = JSON.parse(user.manual_interests) as string[];
        if (tags.length > 0) {
          parts.push(`\nUser explicitly told me they're interested in: ${tags.join(", ")}`);
        }
      } catch { /* ignore */ }
    }
    if (user.tone_preference) {
      parts.push(`\nUser's preferred tone/style: ${user.tone_preference}`);
    }
    if (user.avoid_topics) {
      parts.push(`\nUser asked me to avoid: ${user.avoid_topics}`);
    }

    // Inject learned response preferences from feedback
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildFeedbackContext } = require("./feedback") as { buildFeedbackContext: (id: string) => string };
      const feedbackCtx = buildFeedbackContext(userId);
      if (feedbackCtx) parts.push(feedbackCtx);
    } catch { /* ignore */ }

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
  game_content?: string;
}): MarketplaceGame | null {
  const db = getDb();
  if (!db) return null;
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO marketplace_games (slug, title, genre, engine, concept, thumbnail_url, game_content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title,
        genre = excluded.genre,
        engine = excluded.engine,
        concept = COALESCE(excluded.concept, concept),
        thumbnail_url = COALESCE(excluded.thumbnail_url, thumbnail_url),
        game_content = COALESCE(excluded.game_content, game_content),
        updated_at = excluded.updated_at
    `).run(game.slug, game.title, game.genre, game.engine, game.concept ?? null, game.thumbnail_url ?? null, game.game_content ?? null, now, now);
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

export function getGameContent(slug: string): string | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.prepare("SELECT game_content FROM marketplace_games WHERE slug = ?").get(slug) as { game_content: string | null } | undefined;
    return row?.game_content ?? null;
  } catch { return null; }
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

// ── Search history ────────────────────────────────────────────────────────────

export function logSearch(userId: string | undefined, query: string, resultCount: number): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(
      "INSERT INTO search_history (user_id, query, results, searched_at) VALUES (?, ?, ?, ?)"
    ).run(userId ?? null, query, resultCount, new Date().toISOString());
  } catch { /* ignore */ }
}

export interface SearchEntry {
  id: number;
  user_id: string | null;
  query: string;
  results: number;
  searched_at: string;
}

export function getSearchHistory(limit = 200): SearchEntry[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT * FROM search_history ORDER BY searched_at DESC LIMIT ?"
    ).all(limit) as SearchEntry[];
  } catch { return []; }
}

// ── Personas ──────────────────────────────────────────────────────────────────

export interface PersonaRow {
  id: string;
  name: string;
  vibe_id: string;
  status: "bootstrapping" | "hero_selected" | "pulid_expanding" | "lora_training" | "locked" | "failed" | "retired";
  ai_disclosed: number;
  hero_image_url: string | null;
  hero_seed: number | null;
  hero_prompt: string | null;
  hero_embedding: string | null; // JSON float array
  lora_url: string | null;
  lora_trigger: string | null;
  training_images: string | null; // JSON string[]
  similarity_avg: number | null;
  welcome_dm: string | null;
  created_at: string;
  locked_at: string | null;
}

export function insertPersona(p: PersonaRow): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`INSERT OR REPLACE INTO personas
      (id,name,vibe_id,status,ai_disclosed,hero_image_url,hero_seed,hero_prompt,hero_embedding,lora_url,lora_trigger,training_images,similarity_avg,welcome_dm,created_at,locked_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(p.id,p.name,p.vibe_id,p.status,p.ai_disclosed,p.hero_image_url,p.hero_seed,p.hero_prompt,p.hero_embedding,p.lora_url,p.lora_trigger,p.training_images,p.similarity_avg,p.welcome_dm,p.created_at,p.locked_at);
  } catch { /* ignore */ }
}

export function updatePersona(id: string, fields: Partial<PersonaRow>): void {
  const db = getDb();
  if (!db) return;
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(", ");
  const vals = [...Object.values(fields), id];
  try { db.prepare(`UPDATE personas SET ${sets} WHERE id = ?`).run(...vals); } catch { /* ignore */ }
}

export function getPersona(id: string): PersonaRow | null {
  const db = getDb();
  if (!db) return null;
  try { return db.prepare("SELECT * FROM personas WHERE id = ?").get(id) as PersonaRow | null; } catch { return null; }
}

export function listPersonas(): PersonaRow[] {
  const db = getDb();
  if (!db) return [];
  try { return db.prepare("SELECT * FROM personas ORDER BY created_at DESC").all() as PersonaRow[]; } catch { return []; }
}

// ── Defender ─────────────────────────────────────────────────────────────────

export function blockIp(ip: string, reason: string, blockedBy = "lyra", cfRuleId?: string, expiresAt?: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(
      "INSERT OR REPLACE INTO blocked_ips (ip, reason, blocked_by, cf_rule_id, blocked_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(ip, reason, blockedBy, cfRuleId ?? null, new Date().toISOString(), expiresAt ?? null);
  } catch { /* ignore */ }
}

export function unblockIp(ip: string): void {
  const db = getDb();
  if (!db) return;
  try { db.prepare("DELETE FROM blocked_ips WHERE ip = ?").run(ip); } catch { /* ignore */ }
}

export function isIpBlocked(ip: string): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const row = db.prepare("SELECT ip, expires_at FROM blocked_ips WHERE ip = ?").get(ip) as { ip: string; expires_at: string | null } | undefined;
    if (!row) return false;
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      db.prepare("DELETE FROM blocked_ips WHERE ip = ?").run(ip);
      return false;
    }
    return true;
  } catch { return false; }
}

export function getBlockedIps(): Array<{ ip: string; reason: string; blocked_by: string; blocked_at: string; expires_at: string | null }> {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare("SELECT ip, reason, blocked_by, blocked_at, expires_at FROM blocked_ips ORDER BY blocked_at DESC").all() as Array<{ ip: string; reason: string; blocked_by: string; blocked_at: string; expires_at: string | null }>;
  } catch { return []; }
}

export function logSecurityEvent(type: string, severity: "low" | "medium" | "high" | "critical", details: string, ip?: string, userId?: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(
      "INSERT INTO security_events (type, ip, user_id, details, severity, occurred_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(type, ip ?? null, userId ?? null, details, severity, new Date().toISOString());
  } catch { /* ignore */ }
}

export function getSecurityEvents(limit = 100): Array<{ id: number; type: string; ip: string | null; user_id: string | null; details: string; severity: string; resolved: number; occurred_at: string }> {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM security_events ORDER BY occurred_at DESC LIMIT ?").all(limit) as Array<{ id: number; type: string; ip: string | null; user_id: string | null; details: string; severity: string; resolved: number; occurred_at: string }>;
  } catch { return []; }
}

export function suspendUser(userId: string, reason: string, suspendedBy = "lyra", expiresAt?: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(
      "INSERT OR REPLACE INTO suspended_users (user_id, reason, suspended_by, suspended_at, expires_at) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, reason, suspendedBy, new Date().toISOString(), expiresAt ?? null);
  } catch { /* ignore */ }
}

export function isUserSuspended(userId: string): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const row = db.prepare("SELECT user_id, expires_at FROM suspended_users WHERE user_id = ?").get(userId) as { user_id: string; expires_at: string | null } | undefined;
    if (!row) return false;
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      db.prepare("DELETE FROM suspended_users WHERE user_id = ?").run(userId);
      return false;
    }
    return true;
  } catch { return false; }
}

// ── Bookshelf ──────────────────────────────────────────────────────────────────

export interface DbBook {
  id: string;
  user_id: string;
  type: string;           // 'book' | 'research_paper' | 'comic' | 'document'
  title: string;
  subtitle: string | null;
  author: string | null;
  genre: string | null;
  description: string | null;
  cover_url: string | null;
  content: string;        // JSON string of chapters / sections
  pdf_path: string | null;
  word_count: number;
  created_at: string;
}

export function saveBook(fields: {
  userId: string;
  type: string;
  title: string;
  subtitle?: string;
  author?: string;
  genre?: string;
  description?: string;
  coverUrl?: string;
  content: object;
  pdfPath?: string;
  wordCount?: number;
}): string {
  const db = getDb();
  if (!db) throw new Error("DB unavailable");
  const id = randomUUID();
  db.prepare(`
    INSERT INTO lyra_books (id, user_id, type, title, subtitle, author, genre, description, cover_url, content, pdf_path, word_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, fields.userId, fields.type, fields.title,
    fields.subtitle ?? null, fields.author ?? null, fields.genre ?? null,
    fields.description ?? null, fields.coverUrl ?? null,
    JSON.stringify(fields.content), fields.pdfPath ?? null,
    fields.wordCount ?? 0, new Date().toISOString()
  );
  return id;
}

export function listBooks(userId: string, type?: string): DbBook[] {
  const db = getDb();
  if (!db) return [];
  try {
    if (type) {
      return db.prepare("SELECT * FROM lyra_books WHERE user_id = ? AND type = ? ORDER BY created_at DESC").all(userId, type) as DbBook[];
    }
    return db.prepare("SELECT * FROM lyra_books WHERE user_id = ? ORDER BY created_at DESC").all(userId) as DbBook[];
  } catch { return []; }
}

export function getBook(id: string): DbBook | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare("SELECT * FROM lyra_books WHERE id = ?").get(id) as DbBook | undefined) ?? null;
  } catch { return null; }
}

export function deleteBook(id: string, userId: string): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const result = db.prepare("DELETE FROM lyra_books WHERE id = ? AND user_id = ?").run(id, userId);
    return result.changes > 0;
  } catch { return false; }
}

// ── Lab experiments ────────────────────────────────────────────────────────────

export interface DbExperiment {
  id: string;
  user_id: string;
  type: string;
  title: string;
  hypothesis: string | null;
  status: "running" | "completed" | "failed";
  result: string | null;
  log: string | null;
  metadata: string | null;
  created_at: string;
  finished_at: string | null;
}

export function saveExperiment(fields: {
  userId: string;
  type: string;
  title: string;
  hypothesis?: string;
  metadata?: Record<string, unknown>;
}): string {
  const db = getDb();
  if (!db) return "";
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO lyra_experiments (id, user_id, type, title, hypothesis, status, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, 'running', ?, ?)
  `).run(id, fields.userId, fields.type, fields.title, fields.hypothesis ?? null,
    fields.metadata ? JSON.stringify(fields.metadata) : null, now);
  return id;
}

export function updateExperiment(id: string, fields: {
  status?: "running" | "completed" | "failed";
  result?: string;
  log?: string;
}) {
  const db = getDb();
  if (!db) return;
  const updates: string[] = [];
  const vals: unknown[] = [];
  if (fields.status) { updates.push("status = ?"); vals.push(fields.status); }
  if (fields.result !== undefined) { updates.push("result = ?"); vals.push(fields.result); }
  if (fields.log !== undefined) { updates.push("log = ?"); vals.push(fields.log); }
  if (fields.status === "completed" || fields.status === "failed") {
    updates.push("finished_at = ?"); vals.push(new Date().toISOString());
  }
  if (!updates.length) return;
  vals.push(id);
  db.prepare(`UPDATE lyra_experiments SET ${updates.join(", ")} WHERE id = ?`).run(...(vals as Parameters<typeof db.prepare>[0][]));
}

export function listExperiments(userId: string, limit = 20): DbExperiment[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM lyra_experiments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(userId, limit) as DbExperiment[];
  } catch { return []; }
}

export function getExperiment(id: string): DbExperiment | null {
  const db = getDb();
  if (!db) return null;
  try {
    return (db.prepare("SELECT * FROM lyra_experiments WHERE id = ?").get(id) as DbExperiment | undefined) ?? null;
  } catch { return null; }
}

// ── Job Applications ──────────────────────────────────────────────────────────

function ensureJobsTable(db: import("better-sqlite3").Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lyra_job_applications (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT DEFAULT 'applied',
      resume_used TEXT,
      cover_letter TEXT,
      applied_at TEXT DEFAULT (datetime('now')),
      follow_up_at TEXT,
      followed_up INTEGER DEFAULT 0,
      notes TEXT,
      salary TEXT,
      source TEXT
    );
    CREATE TABLE IF NOT EXISTS lyra_job_profile (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export interface DbJobApplication {
  id: string; job_id?: string; title: string; company: string; url: string;
  status: string; resume_used?: string; cover_letter?: string;
  applied_at: string; follow_up_at?: string; followed_up: number;
  notes?: string; salary?: string; source?: string;
}

export function saveJobApplication(fields: {
  title: string; company: string; url: string; job_id?: string;
  resume_used?: string; cover_letter?: string; salary?: string; source?: string;
}): string {
  const db = getDb(); if (!db) return "";
  try {
    ensureJobsTable(db);
    const id = Math.random().toString(36).slice(2);
    const followUpAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT OR IGNORE INTO lyra_job_applications
      (id,job_id,title,company,url,resume_used,cover_letter,salary,source,follow_up_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id, fields.job_id ?? null, fields.title, fields.company, fields.url,
        fields.resume_used ?? null, fields.cover_letter ?? null,
        fields.salary ?? null, fields.source ?? null, followUpAt);
    return id;
  } catch { return ""; }
}

export function listJobApplications(status?: string): DbJobApplication[] {
  const db = getDb(); if (!db) return [];
  try {
    ensureJobsTable(db);
    if (status) return db.prepare("SELECT * FROM lyra_job_applications WHERE status=? ORDER BY applied_at DESC").all(status) as DbJobApplication[];
    return db.prepare("SELECT * FROM lyra_job_applications ORDER BY applied_at DESC").all() as DbJobApplication[];
  } catch { return []; }
}

export function updateJobStatus(id: string, status: string, notes?: string): void {
  const db = getDb(); if (!db) return;
  try {
    ensureJobsTable(db);
    db.prepare("UPDATE lyra_job_applications SET status=?, notes=? WHERE id=?")
      .run(status, notes ?? null, id);
  } catch { /* non-fatal */ }
}

export function getJobsDueFollowUp(): DbJobApplication[] {
  const db = getDb(); if (!db) return [];
  try {
    ensureJobsTable(db);
    return db.prepare(`SELECT * FROM lyra_job_applications
      WHERE followed_up=0 AND status='applied' AND follow_up_at <= datetime('now')`)
      .all() as DbJobApplication[];
  } catch { return []; }
}

export function markFollowedUp(id: string): void {
  const db = getDb(); if (!db) return;
  try {
    ensureJobsTable(db);
    db.prepare("UPDATE lyra_job_applications SET followed_up=1 WHERE id=?").run(id);
  } catch { /* non-fatal */ }
}

export function saveJobProfile(resume: string, targetRole: string, background: string): void {
  const db = getDb(); if (!db) return;
  try {
    ensureJobsTable(db);
    const upsert = db.prepare(`INSERT INTO lyra_job_profile (key,value,updated_at) VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`);
    upsert.run("resume", resume, new Date().toISOString());
    upsert.run("target_role", targetRole, new Date().toISOString());
    upsert.run("background", background, new Date().toISOString());
  } catch { /* non-fatal */ }
}

export function getJobProfile(): { resume: string; targetRole: string; background: string } | null {
  const db = getDb(); if (!db) return null;
  try {
    ensureJobsTable(db);
    const rows = db.prepare("SELECT key, value FROM lyra_job_profile").all() as Array<{ key: string; value: string }>;
    if (!rows.length) return null;
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    if (!map.resume) return null;
    return { resume: map.resume, targetRole: map.target_role ?? "", background: map.background ?? "" };
  } catch { return null; }
}

// ── Gumroad token storage ─────────────────────────────────────────────────────

export function saveGumroadToken(token: string): void {
  const db = getDb(); if (!db) return;
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS lyra_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)`);
    db.prepare(`INSERT INTO lyra_settings (key,value,updated_at) VALUES ('gumroad_token',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`)
      .run(token, new Date().toISOString());
  } catch { /* non-fatal */ }
}

export function getGumroadToken(): string | null {
  const db = getDb(); if (!db) return null;
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS lyra_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)`);
    const row = db.prepare("SELECT value FROM lyra_settings WHERE key='gumroad_token'").get() as { value: string } | undefined;
    return row?.value ?? process.env.GUMROAD_ACCESS_TOKEN ?? null;
  } catch { return process.env.GUMROAD_ACCESS_TOKEN ?? null; }
}

// ── Commerce ──────────────────────────────────────────────────────────────────

function ensureCommerceTable(db: import("better-sqlite3").Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lyra_products (
      id TEXT PRIMARY KEY,
      gumroad_id TEXT,
      name TEXT NOT NULL,
      price INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      file_url TEXT,
      cover_url TEXT,
      short_url TEXT,
      sales INTEGER DEFAULT 0,
      revenue INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      last_checked TEXT
    );
  `);
}

export interface DbProduct {
  id: string; gumroad_id?: string; name: string; price: number;
  status: string; file_url?: string; cover_url?: string; short_url?: string;
  sales: number; revenue: number; created_at: string;
}

export function saveCommerceProduct(fields: {
  gumroad_id?: string; name: string; price: number;
  file_url?: string; cover_url?: string; status?: string; short_url?: string;
}): string {
  const db = getDb(); if (!db) return "";
  try {
    ensureCommerceTable(db);
    const id = Math.random().toString(36).slice(2);
    db.prepare(`INSERT INTO lyra_products (id,gumroad_id,name,price,file_url,cover_url,status,short_url)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, fields.gumroad_id ?? null, fields.name, fields.price,
        fields.file_url ?? null, fields.cover_url ?? null,
        fields.status ?? "draft", fields.short_url ?? null);
    return id;
  } catch { return ""; }
}

export function listCommerceProducts(): DbProduct[] {
  const db = getDb(); if (!db) return [];
  try {
    ensureCommerceTable(db);
    return db.prepare("SELECT * FROM lyra_products ORDER BY created_at DESC").all() as DbProduct[];
  } catch { return []; }
}

export function updateProductStats(gumroadId: string, sales: number, revenue: number): void {
  const db = getDb(); if (!db) return;
  try {
    ensureCommerceTable(db);
    db.prepare("UPDATE lyra_products SET sales=?, revenue=?, last_checked=? WHERE gumroad_id=?")
      .run(sales, revenue, new Date().toISOString(), gumroadId);
  } catch { /* non-fatal */ }
}

// ── Skills ─────────────────────────────────────────────────────────────────────

export interface DbSkill {
  id: string; name: string; description: string; type: string;
  status: "pending" | "active" | "disabled"; content: string;
  uses: number; successes: number; created_at: string; last_used: string | null;
}

export function saveSkill(fields: {
  name: string; description: string; type?: string; content: string; status?: string;
}): string {
  const db = getDb(); if (!db) return "";
  const existing = db.prepare("SELECT id FROM lyra_skills WHERE name = ?").get(fields.name) as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE lyra_skills SET description=?, content=?, type=? WHERE name=?")
      .run(fields.description, fields.content, fields.type ?? "skill", fields.name);
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(`INSERT INTO lyra_skills (id,name,description,type,status,content,uses,successes,created_at)
    VALUES (?,?,?,?,?,?,0,0,?)`)
    .run(id, fields.name, fields.description, fields.type ?? "skill",
      fields.status ?? "pending", fields.content, new Date().toISOString());
  return id;
}

export function approveSkill(name: string): boolean {
  const db = getDb(); if (!db) return false;
  try { db.prepare("UPDATE lyra_skills SET status='active' WHERE name=?").run(name); return true; }
  catch { return false; }
}

export function disableSkill(name: string): boolean {
  const db = getDb(); if (!db) return false;
  try { db.prepare("UPDATE lyra_skills SET status='disabled' WHERE name=?").run(name); return true; }
  catch { return false; }
}

export function deleteSkill(name: string): boolean {
  const db = getDb(); if (!db) return false;
  try { db.prepare("DELETE FROM lyra_skills WHERE name=?").run(name); return true; }
  catch { return false; }
}

export function listSkills(statusFilter?: string): DbSkill[] {
  const db = getDb(); if (!db) return [];
  try {
    if (statusFilter) return db.prepare("SELECT * FROM lyra_skills WHERE status=? ORDER BY uses DESC").all(statusFilter) as DbSkill[];
    return db.prepare("SELECT * FROM lyra_skills ORDER BY (status='active') DESC, uses DESC").all() as DbSkill[];
  } catch { return []; }
}

export function getSkillByName(name: string): DbSkill | null {
  const db = getDb(); if (!db) return null;
  try { return (db.prepare("SELECT * FROM lyra_skills WHERE name=?").get(name) as DbSkill | undefined) ?? null; }
  catch { return null; }
}

export function logSkillUse(name: string, success: boolean, note?: string): void {
  const db = getDb(); if (!db) return;
  try {
    db.prepare("INSERT INTO lyra_skill_log (skill_name,success,note,used_at) VALUES (?,?,?,?)")
      .run(name, success ? 1 : 0, note ?? null, new Date().toISOString());
    db.prepare("UPDATE lyra_skills SET uses=uses+1, successes=successes+?, last_used=? WHERE name=?")
      .run(success ? 1 : 0, new Date().toISOString(), name);
  } catch { /* non-fatal */ }
}

export function getSkillLog(name?: string, limit = 50): Array<{ skill_name: string; success: number; note: string | null; used_at: string }> {
  const db = getDb(); if (!db) return [];
  try {
    if (name) return db.prepare("SELECT * FROM lyra_skill_log WHERE skill_name=? ORDER BY used_at DESC LIMIT ?").all(name, limit) as never;
    return db.prepare("SELECT * FROM lyra_skill_log ORDER BY used_at DESC LIMIT ?").all(limit) as never;
  } catch { return []; }
}

