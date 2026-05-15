/**
 * lib/lyra/social-tokens.ts
 * Storage and retrieval for social platform OAuth tokens.
 */

function getDb() {
  const Database = require("better-sqlite3");
  const path = require("path");
  const fs = require("fs");
  const DATA_DIR = path.join(process.env.APP_DIR ?? process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "lyra.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_tokens (
      user_id       TEXT NOT NULL,
      platform      TEXT NOT NULL,
      access_token  TEXT NOT NULL,
      refresh_token TEXT,
      expires_at    TEXT,
      page_id       TEXT,
      page_name     TEXT,
      username      TEXT,
      scopes        TEXT,
      created_at    TEXT NOT NULL,
      PRIMARY KEY (user_id, platform)
    )
  `);
  return db;
}

export type SocialPlatform = "facebook" | "instagram" | "tiktok";

export interface SocialToken {
  platform: SocialPlatform;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  page_id?: string;
  page_name?: string;
  username?: string;
}

export function saveSocialToken(userId: string, token: SocialToken): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO social_tokens
        (user_id, platform, access_token, refresh_token, expires_at, page_id, page_name, username, scopes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      token.platform,
      token.access_token,
      token.refresh_token ?? null,
      token.expires_at ?? null,
      token.page_id ?? null,
      token.page_name ?? null,
      token.username ?? null,
      null,
      new Date().toISOString(),
    );
  } catch (e) {
    console.error("[social-tokens] save error:", e);
  }
}

export function getSocialToken(userId: string, platform: SocialPlatform): SocialToken | null {
  try {
    const db = getDb();
    return db.prepare("SELECT * FROM social_tokens WHERE user_id = ? AND platform = ?").get(userId, platform) ?? null;
  } catch { return null; }
}

export function listSocialTokens(userId: string): SocialToken[] {
  try {
    const db = getDb();
    return db.prepare("SELECT * FROM social_tokens WHERE user_id = ?").all(userId) ?? [];
  } catch { return []; }
}

export function deleteSocialToken(userId: string, platform: SocialPlatform): void {
  try {
    const db = getDb();
    db.prepare("DELETE FROM social_tokens WHERE user_id = ? AND platform = ?").run(userId, platform);
  } catch { /* ignore */ }
}
