/**
 * lib/lyra/trucker.ts
 * HOS (Hours of Service) logic + DAT load board search
 * FMCSA rules: 11hr drive / 14hr on-duty window / 10hr off-duty reset
 * 30-min break required after 8hr driving, 70hr/8-day limit
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

function getDb(): Db | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const dbPath = path.join(process.env.APP_DIR ?? process.cwd(), "data", "lyra.db");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initHosTables(db);
    return db;
  } catch {
    return null;
  }
}

function initHosTables(db: Db) {
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
      notes       TEXT,
      FOREIGN KEY (driver_id) REFERENCES hos_drivers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_hos_logs_driver ON hos_logs(driver_id, start_time DESC);
  `);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type HosStatus = "off_duty" | "sleeper" | "driving" | "on_duty";

export interface HosLogEntry {
  id?: number;
  driver_id: string;
  status: HosStatus;
  start_time: string; // ISO
  end_time: string | null; // ISO or null = ongoing
  location?: string;
  notes?: string;
}

export interface HosStatusResult {
  driver_id: string;
  current_status: HosStatus;
  drive_time_today_min: number;
  on_duty_window_min: number;
  drive_remaining_min: number;
  window_remaining_min: number;
  weekly_on_duty_min: number;
  weekly_remaining_min: number;
  break_needed: boolean;
  reset_available_at: string | null;
  summary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function minutesBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

function hoursMin(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.floor(Math.abs(min) % 60);
  const sign = min < 0 ? "-" : "";
  return `${sign}${h}h ${m}m`;
}

// ── HOS Log ───────────────────────────────────────────────────────────────────

export function hosLogStatus(
  userId: string,
  driverName: string,
  status: HosStatus,
  location?: string,
  notes?: string
): string {
  const db = getDb();
  if (!db) return "Database unavailable.";

  const now = new Date().toISOString();

  // Ensure driver exists
  let driver = db.prepare("SELECT * FROM hos_drivers WHERE user_id = ? AND LOWER(name) = LOWER(?)").get(userId, driverName);
  if (!driver) {
    db.prepare("INSERT INTO hos_drivers (id, user_id, name, cycle, created_at) VALUES (?, ?, ?, '70hr8day', ?)").run(
      `${userId}-${driverName.toLowerCase().replace(/\s+/g, "-")}`,
      userId,
      driverName,
      now
    );
    driver = db.prepare("SELECT * FROM hos_drivers WHERE user_id = ? AND LOWER(name) = LOWER(?)").get(userId, driverName);
  }

  // Close any open log entry
  const openLog = db.prepare("SELECT * FROM hos_logs WHERE driver_id = ? AND end_time IS NULL").get(driver.id);
  if (openLog) {
    db.prepare("UPDATE hos_logs SET end_time = ? WHERE id = ?").run(now, openLog.id);
  }

  // Create new log entry
  db.prepare("INSERT INTO hos_logs (driver_id, status, start_time, end_time, location, notes) VALUES (?, ?, ?, NULL, ?, ?)").run(
    driver.id, status, now, location ?? null, notes ?? null
  );

  const statusLabel = status.replace("_", " ").toUpperCase();
  return `Logged ${statusLabel} for ${driverName} at ${new Date(now).toLocaleTimeString()}${location ? ` — ${location}` : ""}.`;
}

// ── HOS Status Calculator ─────────────────────────────────────────────────────

export function hosGetStatus(userId: string, driverName: string): HosStatusResult | null {
  const db = getDb();
  if (!db) return null;

  const driver = db.prepare("SELECT * FROM hos_drivers WHERE user_id = ? AND LOWER(name) = LOWER(?)").get(userId, driverName);
  if (!driver) return null;

  const now = new Date().toISOString();
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();

  // Get last 8 days of logs
  const logs: HosLogEntry[] = db.prepare(
    "SELECT * FROM hos_logs WHERE driver_id = ? AND start_time > ? ORDER BY start_time ASC"
  ).all(driver.id, eightDaysAgo);

  // Find last 10hr+ off-duty reset
  let resetStart: string | null = null;
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    if (log.status === "off_duty" || log.status === "sleeper") {
      const end = log.end_time ?? now;
      const dur = minutesBetween(log.start_time, end);
      if (dur >= 600) { // 10 hours
        resetStart = log.start_time;
        break;
      }
    }
  }

  // Only count logs after last reset
  const relevantLogs = resetStart
    ? logs.filter((l) => l.start_time >= resetStart!)
    : logs;

  // Find start of 14hr on-duty window (first on-duty/driving after last reset)
  const windowStart = relevantLogs.find(
    (l) => l.status === "driving" || l.status === "on_duty"
  )?.start_time ?? null;

  // Calculate drive time and on-duty time in current window
  let driveTimeMin = 0;
  let onDutyMin = 0;
  let consecutiveDriveMin = 0; // for 30-min break rule
  let lastBreakTime: string | null = null;

  for (const log of relevantLogs) {
    const end = log.end_time ?? now;
    const dur = minutesBetween(log.start_time, end);
    if (log.status === "driving") {
      driveTimeMin += dur;
      onDutyMin += dur;
      consecutiveDriveMin += dur;
    } else if (log.status === "on_duty") {
      onDutyMin += dur;
      consecutiveDriveMin += dur; // on-duty counts against 8hr break rule
    } else if (log.status === "off_duty" || log.status === "sleeper") {
      if (dur >= 30) {
        consecutiveDriveMin = 0; // 30min break resets consecutive drive
        lastBreakTime = log.end_time ?? now;
      }
    }
  }

  // Current status
  const currentLog = relevantLogs.findLast((l) => !l.end_time);
  const currentStatus: HosStatus = currentLog?.status ?? "off_duty";

  // Remaining time calculations
  const driveRemainingMin = Math.max(0, 660 - driveTimeMin); // 11hr
  const windowElapsedMin = windowStart ? minutesBetween(windowStart, now) : 0;
  const windowRemainingMin = Math.max(0, 840 - windowElapsedMin); // 14hr

  // 70hr/8-day
  const weeklyOnDutyMin = relevantLogs.reduce((sum, l) => {
    if (l.status !== "driving" && l.status !== "on_duty") return sum;
    return sum + minutesBetween(l.start_time, l.end_time ?? now);
  }, 0);
  const weeklyRemainingMin = Math.max(0, 4200 - weeklyOnDutyMin); // 70hr

  // Break needed: 30min break required after 8hr of drive/on-duty without 30min break
  const breakNeeded = consecutiveDriveMin >= 480 && currentStatus === "driving";

  // When reset will be available (need 10hr off after current on-duty)
  let resetAvailableAt: string | null = null;
  if (driveRemainingMin === 0 || windowRemainingMin === 0 || weeklyRemainingMin === 0) {
    const lastDutyEnd = [...relevantLogs].reverse().find((l) => l.end_time)?.end_time ?? now;
    resetAvailableAt = new Date(new Date(lastDutyEnd).getTime() + 10 * 3600 * 1000).toISOString();
  }

  // Summary
  const lines: string[] = [];
  lines.push(`Driver: ${driverName} — ${currentStatus.replace("_", " ").toUpperCase()}`);
  lines.push(`Drive time: ${hoursMin(driveTimeMin)} / 11h (${hoursMin(driveRemainingMin)} left)`);
  lines.push(`14hr window: ${hoursMin(windowElapsedMin)} elapsed (${hoursMin(windowRemainingMin)} left)`);
  lines.push(`70hr/8-day: ${hoursMin(weeklyOnDutyMin)} used (${hoursMin(weeklyRemainingMin)} left)`);
  if (breakNeeded) lines.push("⚠️ 30-minute break required NOW");
  if (resetAvailableAt) lines.push(`Reset available at: ${new Date(resetAvailableAt).toLocaleString()}`);

  return {
    driver_id: driver.id,
    current_status: currentStatus,
    drive_time_today_min: Math.round(driveTimeMin),
    on_duty_window_min: Math.round(windowElapsedMin),
    drive_remaining_min: Math.round(driveRemainingMin),
    window_remaining_min: Math.round(windowRemainingMin),
    weekly_on_duty_min: Math.round(weeklyOnDutyMin),
    weekly_remaining_min: Math.round(weeklyRemainingMin),
    break_needed: breakNeeded,
    reset_available_at: resetAvailableAt,
    summary: lines.join("\n"),
  };
}

// ── Load Board Search ─────────────────────────────────────────────────────────

export interface LoadResult {
  id: string;
  origin: string;
  destination: string;
  pickup_date: string;
  equipment: string;
  weight_lbs: number;
  length_ft: number;
  rate_per_mile: number;
  total_miles: number;
  total_pay: number;
  broker: string;
  phone: string;
  notes: string;
}

function mockLoads(origin: string, destination: string, equipment: string): LoadResult[] {
  const brokers = ["Coyote Logistics", "Echo Global", "CH Robinson", "Total Quality Logistics", "XPO Logistics"];
  const now = new Date();
  const loads: LoadResult[] = [];

  const routes = [
    { o: origin || "Chicago, IL", d: destination || "Atlanta, GA", miles: 716, rpm: 2.45 },
    { o: origin || "Dallas, TX", d: destination || "Los Angeles, CA", miles: 1435, rpm: 2.12 },
    { o: origin || "New York, NY", d: destination || "Miami, FL", miles: 1280, rpm: 2.67 },
    { o: origin || "Seattle, WA", d: destination || "Phoenix, AZ", miles: 1421, rpm: 2.30 },
    { o: origin || "Denver, CO", d: destination || "Kansas City, MO", miles: 598, rpm: 2.55 },
  ];

  for (let i = 0; i < 5; i++) {
    const route = routes[i % routes.length];
    const pickupDate = new Date(now.getTime() + (i + 1) * 24 * 3600 * 1000);
    const weight = 20000 + Math.floor(Math.random() * 24000);
    const length = equipment === "flatbed" ? 48 : 53;
    const rpmVariance = (Math.random() - 0.5) * 0.4;
    const ratePerMile = parseFloat((route.rpm + rpmVariance).toFixed(2));

    loads.push({
      id: `LOAD-${Date.now()}-${i}`,
      origin: route.o,
      destination: route.d,
      pickup_date: pickupDate.toISOString().slice(0, 10),
      equipment: equipment || "dryvan",
      weight_lbs: weight,
      length_ft: length,
      rate_per_mile: ratePerMile,
      total_miles: route.miles,
      total_pay: Math.round(ratePerMile * route.miles),
      broker: brokers[i % brokers.length],
      phone: `1-800-${String(Math.floor(Math.random() * 9000000) + 1000000).slice(0, 3)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      notes: i === 0 ? "TONU available, team drivers ok" : i === 2 ? "Hazmat cert required" : "No touch freight",
    });
  }

  return loads;
}

export async function loadSearch(
  origin: string,
  destination: string,
  equipment: string,
  _dhmiles?: number
): Promise<LoadResult[]> {
  const datKey = process.env.DAT_API_KEY;

  if (datKey) {
    try {
      // DAT OAuth2 token
      const tokenRes = await fetch("https://identity.dat.com/access/v1/token/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: process.env.DAT_CLIENT_ID ?? "",
          clientSecret: datKey,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (tokenRes.ok) {
        const { accessToken } = await tokenRes.json();

        const searchRes = await fetch("https://freight.dat.com/posting/search/loads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            origin: { city: origin, stateProv: "", country: "US" },
            destination: destination ? { city: destination, stateProv: "", country: "US" } : undefined,
            equipmentType: equipment?.toUpperCase() || "VAN",
            limit: 10,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (searchRes.ok) {
          const data = await searchRes.json();
          return (data.matchingLoads ?? []).slice(0, 8).map((l: Record<string, unknown>) => ({
            id: String(l.id ?? ""),
            origin: String((l.origin as Record<string, unknown>)?.description ?? origin),
            destination: String((l.destination as Record<string, unknown>)?.description ?? destination),
            pickup_date: String(l.earliestAvailability ?? "").slice(0, 10),
            equipment: String(l.equipmentType ?? equipment),
            weight_lbs: Number(l.weight ?? 0),
            length_ft: Number(l.length ?? 53),
            rate_per_mile: Number((l.rateInfo as Record<string, unknown>)?.ratePerMile ?? 0),
            total_miles: Number((l.tripLength as Record<string, unknown>)?.miles ?? 0),
            total_pay: Number((l.rateInfo as Record<string, unknown>)?.amount ?? 0),
            broker: String((l.posterInfo as Record<string, unknown>)?.companyName ?? "Unknown"),
            phone: String((l.posterInfo as Record<string, unknown>)?.phone ?? ""),
            notes: String(l.comments ?? ""),
          }));
        }
      }
    } catch {
      // Fall through to mock
    }
  }

  // Mock fallback
  return mockLoads(origin, destination, equipment);
}

// ── Format load results for chat ──────────────────────────────────────────────

export function formatLoads(loads: LoadResult[], useMock = false): string {
  if (loads.length === 0) return "No loads found for those criteria.";

  const lines: string[] = [
    useMock ? "📋 **Load Board** *(mock data — add DAT_API_KEY for live)*" : "📋 **Load Board Results**",
    "",
  ];

  for (const l of loads) {
    lines.push(`**${l.origin} → ${l.destination}**`);
    lines.push(`  Pickup: ${l.pickup_date}  |  ${l.equipment.toUpperCase()}  |  ${(l.weight_lbs / 2000).toFixed(0)}T`);
    lines.push(`  ${l.total_miles} mi  |  $${l.rate_per_mile.toFixed(2)}/mi  |  **$${l.total_pay.toLocaleString()}**`);
    lines.push(`  Broker: ${l.broker}  ${l.phone}`);
    if (l.notes) lines.push(`  ℹ️ ${l.notes}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
