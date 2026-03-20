import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "lyra.db");

// Singleton — one connection per server process
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");   // concurrent reads while writing
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
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
  `);
}

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

// ── Users ─────────────────────────────────────────────────────────────────────

export function upsertUser(id: string, name?: string): DbUser {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
  if (existing) {
    db.prepare(
      "UPDATE users SET last_seen = ?, name = COALESCE(?, name) WHERE id = ?"
    ).run(now, name ?? null, id);
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
  }
  db.prepare(
    "INSERT INTO users (id, name, first_seen, last_seen) VALUES (?, ?, ?, ?)"
  ).run(id, name ?? null, now, now);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
}

export function getUser(id: string): DbUser | null {
  return (getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser) ?? null;
}

// ── Facts ─────────────────────────────────────────────────────────────────────

export function upsertFact(userId: string, key: string, value: string): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO facts (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(userId, key.toLowerCase().trim(), value, now);
}

export function getFacts(userId: string): DbFact[] {
  return getDb()
    .prepare("SELECT * FROM facts WHERE user_id = ? ORDER BY updated_at DESC")
    .all(userId) as DbFact[];
}

// ── Conversations ─────────────────────────────────────────────────────────────

export function saveConversation(
  id: string,
  userId: string,
  summary: string,
  messageCount: number
): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO conversations (id, user_id, summary, message_count, timestamp) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET summary = excluded.summary, message_count = excluded.message_count, timestamp = excluded.timestamp`
    )
    .run(id, userId, summary, messageCount, now);
}

export function getRecentConversations(userId: string, limit = 5): DbConversation[] {
  return getDb()
    .prepare(
      "SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?"
    )
    .all(userId, limit) as DbConversation[];
}

// ── CRM ───────────────────────────────────────────────────────────────────────

export function upsertCrmContact(
  name: string,
  phone?: string,
  email?: string,
  notes?: string
): DbCrmContact {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT * FROM crm_contacts WHERE LOWER(name) = LOWER(?)")
    .get(name) as DbCrmContact | undefined;

  if (existing) {
    // Append new notes rather than overwrite
    const newNotes = notes
      ? existing.notes
        ? `${existing.notes} | ${notes}`
        : notes
      : existing.notes;
    db.prepare(
      `UPDATE crm_contacts SET
         phone = COALESCE(?, phone),
         email = COALESCE(?, email),
         notes = ?,
         updated_at = ?
       WHERE id = ?`
    ).run(phone ?? null, email ?? null, newNotes, now, existing.id);
    return db.prepare("SELECT * FROM crm_contacts WHERE id = ?").get(existing.id) as DbCrmContact;
  }

  const result = db
    .prepare(
      "INSERT INTO crm_contacts (name, phone, email, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, phone ?? null, email ?? null, notes ?? null, now, now);
  return db
    .prepare("SELECT * FROM crm_contacts WHERE id = ?")
    .get(result.lastInsertRowid) as DbCrmContact;
}

export function searchCrmContacts(query?: string): DbCrmContact[] {
  const db = getDb();
  if (!query?.trim()) {
    return db
      .prepare("SELECT * FROM crm_contacts ORDER BY name")
      .all() as DbCrmContact[];
  }
  const q = `%${query.toLowerCase()}%`;
  return db
    .prepare(
      `SELECT * FROM crm_contacts
       WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(notes) LIKE ?
       ORDER BY name`
    )
    .all(q, q, q, q) as DbCrmContact[];
}

export function deleteCrmContact(nameOrId: string): boolean {
  const db = getDb();
  const byId = db
    .prepare("DELETE FROM crm_contacts WHERE id = ?")
    .run(parseInt(nameOrId, 10));
  if (byId.changes > 0) return true;
  const byName = db
    .prepare("DELETE FROM crm_contacts WHERE LOWER(name) = LOWER(?)")
    .run(nameOrId);
  return byName.changes > 0;
}

// ── Memory context builder ────────────────────────────────────────────────────

export function buildMemoryContext(userId: string): string {
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
    conversations.forEach((c) => {
      if (c.summary) {
        parts.push(`  • [${c.timestamp.split("T")[0]}] ${c.summary}`);
      }
    });
  }

  parts.push("--- END MEMORY ---");
  return parts.join("\n");
}
