// ── Rugged / Survival mode ────────────────────────────────────────────────────
// Dead man's switch, emergency contact management, and SMS alerting via Twilio.
// Uses the shared BetterSQLite3 database (same as the rest of Lyra).

import { getDb } from "@/lib/lyra/db";

export interface EmergencyContact {
  name: string;
  phone: string;    // E.164 format, e.g. "+15551234567"
  relation?: string;
}

export interface DeadManStatus {
  userId: string;
  lastCheckIn: Date | null;
  intervalMinutes: number;
  minutesSince: number | null;
  overdue: boolean;
  contacts: EmergencyContact[];
}

// ── Schema bootstrap (called lazily) ─────────────────────────────────────────

function ensureSchema() {
  const db = getDb();
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS rugged_schedules (
      user_id          TEXT PRIMARY KEY,
      interval_minutes INTEGER NOT NULL DEFAULT 60,
      last_checkin     TEXT NOT NULL,
      created_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rugged_contacts (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id  TEXT NOT NULL,
      name     TEXT NOT NULL,
      phone    TEXT NOT NULL,
      relation TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rugged_contacts_user ON rugged_contacts(user_id);
  `);
}

// ── In-memory timer store ─────────────────────────────────────────────────────

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Store check-in schedule and start the countdown timer */
export function startDeadManSwitch(
  userId: string,
  intervalMinutes: number,
  contacts: EmergencyContact[]
): void {
  ensureSchema();
  const db = getDb();
  if (!db) throw new Error("Database unavailable.");

  saveEmergencyContacts(userId, contacts);

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO rugged_schedules (user_id, interval_minutes, last_checkin, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      interval_minutes = excluded.interval_minutes,
      last_checkin     = excluded.last_checkin
  `).run(userId, intervalMinutes, now, now);

  _resetTimer(userId, intervalMinutes);
}

/** Reset the dead man's switch timer */
export function checkIn(userId: string): void {
  ensureSchema();
  const db = getDb();
  if (!db) throw new Error("Database unavailable.");

  const now = new Date().toISOString();
  const result = db.prepare(
    `UPDATE rugged_schedules SET last_checkin = ? WHERE user_id = ?`
  ).run(now, userId);

  if (result.changes === 0) {
    throw new Error(`No dead man's switch found for user ${userId}. Call startDeadManSwitch first.`);
  }

  const row = db.prepare(
    `SELECT interval_minutes FROM rugged_schedules WHERE user_id = ?`
  ).get(userId) as { interval_minutes: number } | undefined;

  if (row) _resetTimer(userId, row.interval_minutes);
}

/** Returns time since last check-in and overdue status */
export function getDeadManStatus(userId: string): DeadManStatus {
  ensureSchema();
  const db = getDb();
  if (!db) throw new Error("Database unavailable.");

  const row = db.prepare(
    `SELECT interval_minutes, last_checkin FROM rugged_schedules WHERE user_id = ?`
  ).get(userId) as { interval_minutes: number; last_checkin: string } | undefined;

  const contacts = getEmergencyContacts(userId);

  if (!row) {
    return {
      userId, lastCheckIn: null, intervalMinutes: 0,
      minutesSince: null, overdue: false, contacts,
    };
  }

  const lastCheckIn = row.last_checkin ? new Date(row.last_checkin) : null;
  const intervalMinutes = row.interval_minutes;
  const minutesSince = lastCheckIn
    ? Math.floor((Date.now() - lastCheckIn.getTime()) / 60_000)
    : null;
  const overdue = minutesSince !== null && minutesSince > intervalMinutes;

  return { userId, lastCheckIn, intervalMinutes, minutesSince, overdue, contacts };
}

/** Send SMS to all emergency contacts via Twilio */
export async function alertContacts(
  userId: string,
  message: string,
  location: { lat: number; lng: number } | null
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !auth || !from) {
    throw new Error(
      "Twilio not configured — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM to .env.local."
    );
  }

  const contacts = getEmergencyContacts(userId);
  if (contacts.length === 0) throw new Error("No emergency contacts on file for this user.");

  const locationStr = location
    ? ` Location: https://maps.google.com/?q=${location.lat},${location.lng}`
    : "";
  const fullMessage = `${message}${locationStr}`;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    try {
      const body = new URLSearchParams({ To: contact.phone, From: from, Body: fullMessage });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`${sid}:${auth}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
          signal: AbortSignal.timeout(15_000),
        }
      );
      const data = await res.json() as { message?: string; sid?: string };
      if (!res.ok) {
        failed++;
        errors.push(`${contact.phone}: ${data.message ?? res.statusText}`);
      } else {
        sent++;
      }
    } catch (e) {
      failed++;
      errors.push(`${contact.phone}: ${e instanceof Error ? e.message : String(e)}`);
    }
    // Respect Twilio rate limits
    await new Promise<void>((r) => setTimeout(r, 200));
  }

  return { sent, failed, errors };
}

/** Persist emergency contacts to DB (replaces existing list for this user) */
export function saveEmergencyContacts(userId: string, contacts: EmergencyContact[]): void {
  ensureSchema();
  const db = getDb();
  if (!db) throw new Error("Database unavailable.");

  db.prepare(`DELETE FROM rugged_contacts WHERE user_id = ?`).run(userId);

  const insert = db.prepare(
    `INSERT INTO rugged_contacts (user_id, name, phone, relation) VALUES (?, ?, ?, ?)`
  );
  for (const c of contacts) {
    insert.run(userId, c.name, c.phone, c.relation ?? null);
  }
}

/** Retrieve emergency contacts from DB */
export function getEmergencyContacts(userId: string): EmergencyContact[] {
  ensureSchema();
  const db = getDb();
  if (!db) return [];

  const rows = db.prepare(
    `SELECT name, phone, relation FROM rugged_contacts WHERE user_id = ? ORDER BY id`
  ).all(userId) as Array<{ name: string; phone: string; relation: string | null }>;

  return rows.map((r) => ({
    name: r.name,
    phone: r.phone,
    relation: r.relation ?? undefined,
  }));
}

// ── Internal timer helper ──────────────────────────────────────────────────────

function _resetTimer(userId: string, intervalMinutes: number) {
  const existing = timers.get(userId);
  if (existing) clearTimeout(existing);

  const ms = intervalMinutes * 60 * 1000;
  const t = setTimeout(() => {
    const status = getDeadManStatus(userId);
    if (status.overdue) {
      alertContacts(
        userId,
        `EMERGENCY: ${userId} has not checked in for ${intervalMinutes} minutes.`,
        null
      ).catch(() => {});
    }
  }, ms);

  timers.set(userId, t);
}
