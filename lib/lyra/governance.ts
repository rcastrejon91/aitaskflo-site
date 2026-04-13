/**
 * Lyra Governance Layer (Module 3.5)
 *
 * Three safeguards for autonomous operations:
 *   1. Spend caps  — per-day/week/month cost tracking with configurable limits
 *   2. Loop detection — autonomous chains > 10 steps auto-pause
 *   3. Cron locks  — single-instance enforcement for scheduled jobs
 *
 * All checks are synchronous (SQLite) to keep call overhead < 1ms.
 */

import { getDb } from "./db";

// ── 1. Schema (additive) ─────────────────────────────────────────────────────

export function initGovernanceSchema(): void {
  const db = getDb();
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyra_spend (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        service    TEXT NOT NULL,      -- 'anthropic' | 'fal' | 'elevenlabs' | 'twilio' | 'other'
        cost_usd   REAL NOT NULL,
        label      TEXT,               -- e.g. 'daily-text', 'hero-gen', 'lora-train'
        autonomous INTEGER NOT NULL DEFAULT 1,  -- 1 = autonomous, 0 = user-initiated
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_spend_time ON lyra_spend(occurred_at DESC);

      CREATE TABLE IF NOT EXISTS lyra_spend_caps (
        id         INTEGER PRIMARY KEY CHECK (id = 1),
        daily_usd  REAL NOT NULL DEFAULT 5.0,
        weekly_usd REAL NOT NULL DEFAULT 25.0,
        monthly_usd REAL NOT NULL DEFAULT 50.0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lyra_journals (
        id         TEXT PRIMARY KEY,
        type       TEXT NOT NULL,      -- 'loop_pause' | 'spend_pause' | 'cron_skip'
        message    TEXT NOT NULL,
        resolved   INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lyra_cron_locks (
        job_name   TEXT PRIMARY KEY,
        locked_at  TEXT NOT NULL,
        expires_at TEXT NOT NULL       -- TTL: if expired, lock is stale and can be cleared
      );
    `);

    // Seed default caps row if absent
    db.prepare(`
      INSERT OR IGNORE INTO lyra_spend_caps (id, daily_usd, weekly_usd, monthly_usd, updated_at)
      VALUES (1, 5.0, 25.0, 50.0, ?)
    `).run(new Date().toISOString());
  } catch { /* already exists */ }
}

// ── 2. Spend tracking ─────────────────────────────────────────────────────────

export type SpendService = "anthropic" | "fal" | "elevenlabs" | "twilio" | "other";

export interface SpendCaps {
  daily_usd: number;
  weekly_usd: number;
  monthly_usd: number;
}

export function getCaps(): SpendCaps {
  const db = getDb();
  if (!db) return { daily_usd: 5, weekly_usd: 25, monthly_usd: 50 };
  try {
    const row = db.prepare("SELECT daily_usd, weekly_usd, monthly_usd FROM lyra_spend_caps WHERE id = 1").get() as SpendCaps | undefined;
    return row ?? { daily_usd: 5, weekly_usd: 25, monthly_usd: 50 };
  } catch {
    return { daily_usd: 5, weekly_usd: 25, monthly_usd: 50 };
  }
}

export function setCaps(caps: Partial<SpendCaps>): void {
  const db = getDb();
  if (!db) return;
  try {
    const current = getCaps();
    db.prepare(`
      INSERT INTO lyra_spend_caps (id, daily_usd, weekly_usd, monthly_usd, updated_at)
      VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        daily_usd = excluded.daily_usd,
        weekly_usd = excluded.weekly_usd,
        monthly_usd = excluded.monthly_usd,
        updated_at = excluded.updated_at
    `).run(
      caps.daily_usd ?? current.daily_usd,
      caps.weekly_usd ?? current.weekly_usd,
      caps.monthly_usd ?? current.monthly_usd,
      new Date().toISOString()
    );
  } catch { /* ignore */ }
}

export function recordSpend(service: SpendService, cost_usd: number, label?: string, autonomous = true): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(
      "INSERT INTO lyra_spend (service, cost_usd, label, autonomous, occurred_at) VALUES (?, ?, ?, ?, ?)"
    ).run(service, cost_usd, label ?? null, autonomous ? 1 : 0, new Date().toISOString());
  } catch { /* ignore */ }
}

function getSpendSince(since: string): number {
  const db = getDb();
  if (!db) return 0;
  try {
    const row = db.prepare(
      "SELECT COALESCE(SUM(cost_usd), 0) as total FROM lyra_spend WHERE autonomous = 1 AND occurred_at >= ?"
    ).get(since) as { total: number };
    return row.total ?? 0;
  } catch {
    return 0;
  }
}

export interface SpendStatus {
  daily: { spent: number; cap: number; ok: boolean };
  weekly: { spent: number; cap: number; ok: boolean };
  monthly: { spent: number; cap: number; ok: boolean };
}

export function getSpendStatus(): SpendStatus {
  const caps = getCaps();
  const now = new Date();

  const dayStart   = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const daily   = getSpendSince(dayStart.toISOString());
  const weekly  = getSpendSince(weekStart.toISOString());
  const monthly = getSpendSince(monthStart.toISOString());

  return {
    daily:   { spent: daily,   cap: caps.daily_usd,   ok: daily   < caps.daily_usd   },
    weekly:  { spent: weekly,  cap: caps.weekly_usd,  ok: weekly  < caps.weekly_usd  },
    monthly: { spent: monthly, cap: caps.monthly_usd, ok: monthly < caps.monthly_usd },
  };
}

/**
 * Call this before any autonomous (non-user-initiated) API spend.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export function checkSpendAllowed(estimatedCost = 0.01): { allowed: boolean; reason?: string } {
  const status = getSpendStatus();

  if (!status.daily.ok || status.daily.spent + estimatedCost > status.daily.cap) {
    writeJournal("spend_pause", `Daily autonomous spend cap hit ($${status.daily.spent.toFixed(3)} / $${status.daily.cap}). Pausing until tomorrow or cap is raised.`);
    return { allowed: false, reason: `Daily cap hit ($${status.daily.cap}/day)` };
  }
  if (!status.weekly.ok || status.weekly.spent + estimatedCost > status.weekly.cap) {
    writeJournal("spend_pause", `Weekly autonomous spend cap hit ($${status.weekly.spent.toFixed(3)} / $${status.weekly.cap}).`);
    return { allowed: false, reason: `Weekly cap hit ($${status.weekly.cap}/week)` };
  }
  if (!status.monthly.ok || status.monthly.spent + estimatedCost > status.monthly.cap) {
    writeJournal("spend_pause", `Monthly autonomous spend cap hit ($${status.monthly.spent.toFixed(3)} / $${status.monthly.cap}).`);
    return { allowed: false, reason: `Monthly cap hit ($${status.monthly.cap}/month)` };
  }
  return { allowed: true };
}

// ── 3. Loop detection ─────────────────────────────────────────────────────────

const MAX_AUTONOMOUS_STEPS = 10;

export interface ChainContext {
  parentId: string;
  stepCount: number;
  label?: string;
}

/**
 * Call at each step of an autonomous chain.
 * Returns { continue: true } or { continue: false, reason: string }.
 */
export function checkLoopAllowed(ctx: ChainContext): { continue: boolean; reason?: string } {
  if (ctx.stepCount > MAX_AUTONOMOUS_STEPS) {
    writeJournal(
      "loop_pause",
      `Autonomous chain "${ctx.label ?? ctx.parentId}" reached ${ctx.stepCount} steps without user interaction. Pausing. Reply to continue.`
    );
    return { continue: false, reason: `Chain exceeded ${MAX_AUTONOMOUS_STEPS} steps — paused for review` };
  }
  return { continue: true };
}

// ── 4. Cron locks ─────────────────────────────────────────────────────────────

const DEFAULT_LOCK_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Acquire a named cron lock. Returns true if acquired, false if already locked.
 * Stale locks (past expires_at) are automatically cleared.
 */
export function acquireCronLock(jobName: string, ttlMs = DEFAULT_LOCK_TTL_MS): boolean {
  const db = getDb();
  if (!db) return true; // Fail open if DB unavailable
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // Clear any stale lock first
    db.prepare("DELETE FROM lyra_cron_locks WHERE job_name = ? AND expires_at < ?").run(jobName, nowIso);

    // Check if a live lock exists
    const existing = db.prepare("SELECT job_name FROM lyra_cron_locks WHERE job_name = ?").get(jobName);
    if (existing) {
      writeJournal("cron_skip", `Job "${jobName}" skipped — already running.`);
      return false;
    }

    // Acquire
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
    db.prepare(
      "INSERT OR REPLACE INTO lyra_cron_locks (job_name, locked_at, expires_at) VALUES (?, ?, ?)"
    ).run(jobName, nowIso, expiresAt);
    return true;
  } catch {
    return true; // Fail open
  }
}

export function releaseCronLock(jobName: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare("DELETE FROM lyra_cron_locks WHERE job_name = ?").run(jobName);
  } catch { /* ignore */ }
}

// ── 5. Journal ────────────────────────────────────────────────────────────────

import { randomUUID } from "crypto";

export type JournalType = "loop_pause" | "spend_pause" | "cron_skip";

function writeJournal(type: JournalType, message: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(
      "INSERT INTO lyra_journals (id, type, message, resolved, created_at) VALUES (?, ?, ?, 0, ?)"
    ).run(randomUUID(), type, message, new Date().toISOString());
  } catch { /* ignore */ }
}

export function getUnresolvedJournals(): Array<{ id: string; type: string; message: string; created_at: string }> {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT id, type, message, created_at FROM lyra_journals WHERE resolved = 0 ORDER BY created_at DESC LIMIT 20"
    ).all() as Array<{ id: string; type: string; message: string; created_at: string }>;
  } catch {
    return [];
  }
}

export function resolveJournal(id: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare("UPDATE lyra_journals SET resolved = 1 WHERE id = ?").run(id);
  } catch { /* ignore */ }
}
