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
    const DATA_DIR = path.join(process.cwd(), "data");
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
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT NOT NULL,
      key        TEXT NOT NULL,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL,
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
  `);
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

export function upsertFact(userId: string, key: string, value: string): void {
  const db = getDb();
  if (!db) return;
  try {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO facts (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(userId, key.toLowerCase().trim(), value, now);
  } catch (err) {
    console.error("[Lyra DB] upsertFact error:", err instanceof Error ? err.message : err);
  }
}

export function getFacts(userId: string): DbFact[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM facts WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as DbFact[];
  } catch {
    return [];
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

// ── Memory context builder ────────────────────────────────────────────────────

export function buildMemoryContext(userId: string): string {
  try {
    const user = getUser(userId);
    if (!user) return "";

    const facts = getFacts(userId);
    const conversations = getRecentConversations(userId, 5);

    const parts: string[] = ["\n\n--- MEMORY CONTEXT ---"];
    if (user.name) parts.push(`User name: ${user.name}`);
    parts.push(`First seen: ${user.first_seen.split("T")[0]} | Last seen: ${user.last_seen.split("T")[0]}`);

    if (facts.length > 0) {
      parts.push("\nKnown facts about this user:");
      facts.forEach((f) => parts.push(`  • ${f.key}: ${f.value}`));
    }
    if (conversations.length > 0) {
      parts.push("\nRecent conversation summaries:");
      conversations.forEach((c) => { if (c.summary) parts.push(`  • [${c.timestamp.split("T")[0]}] ${c.summary}`); });
    }

    parts.push("--- END MEMORY ---");
    return parts.join("\n");
  } catch {
    return "";
  }
}
