import { NextRequest, NextResponse } from "next/server";
import fsp from "fs/promises";
import nodePath from "path";
import { broadcastPresence } from "@/app/api/lyra/presence/route";

const ADMIN_KEY = process.env.ADMIN_PASSWORD ?? "";

// ── Guardian: SQLite-backed task history ──────────────────────────────────────

function getDb() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
    const db = new Database(nodePath.join(DATA_DIR, "lyra.db"));
    db.pragma("journal_mode = WAL");
    db.exec(`CREATE TABLE IF NOT EXISTS heartbeat_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      ran_at INTEGER NOT NULL,
      result TEXT,
      success INTEGER DEFAULT 1
    )`);
    return db;
  } catch { return null; }
}

function logTaskRun(task: string, result: string, success: boolean) {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare("INSERT INTO heartbeat_log (task, ran_at, result, success) VALUES (?, ?, ?, ?)")
      .run(task, Date.now(), result.slice(0, 500), success ? 1 : 0);
  } catch { /* ignore */ }
}

function getTaskContext(task: string): string {
  const db = getDb();
  if (!db) return "";
  try {
    const rows = db.prepare(
      "SELECT ran_at, result, success FROM heartbeat_log WHERE task = ? ORDER BY ran_at DESC LIMIT 3"
    ).all(task) as Array<{ ran_at: number; result: string; success: number }>;
    if (rows.length === 0) return "";

    const lines = rows.map(r => {
      const ago = Math.round((Date.now() - r.ran_at) / 60000);
      const status = r.success ? "✅" : "❌";
      return `${status} ${ago}m ago: ${r.result.slice(0, 150)}`;
    });
    return `\n\n[Guardian context for ${task}]\nLast ${rows.length} run(s):\n${lines.join("\n")}\nDon't repeat what already worked. Fix what failed.`;
  } catch { return ""; }
}

function shouldSkipTask(task: string): { skip: boolean; reason: string } {
  const db = getDb();
  if (!db) return { skip: false, reason: "" };
  try {
    const recent = db.prepare(
      "SELECT success FROM heartbeat_log WHERE task = ? AND ran_at > ? ORDER BY ran_at DESC LIMIT 3"
    ).all(task, Date.now() - 3600000) as Array<{ success: number }>;

    // Skip if 3 consecutive failures in last hour
    if (recent.length >= 3 && recent.every(r => r.success === 0)) {
      return { skip: true, reason: "3 consecutive failures in last hour" };
    }
    return { skip: false, reason: "" };
  } catch { return { skip: false, reason: "" }; }
}

// Persist lastRun to DB so it survives restarts
function getLastRun(task: string): number {
  const db = getDb();
  if (!db) return 0;
  try {
    const row = db.prepare("SELECT ran_at FROM heartbeat_log WHERE task = ? ORDER BY ran_at DESC LIMIT 1").get(task) as { ran_at: number } | undefined;
    return row?.ran_at ?? 0;
  } catch { return 0; }
}

// ── Parse HEARTBEAT.md tasks ───────────────────────────────────────────────────
interface HeartbeatTask { name: string; interval: string; prompt: string; }

function parseTasks(content: string): HeartbeatTask[] {
  const tasks: HeartbeatTask[] = [];
  const lines = content.split("\n");
  let inTasks = false;
  let current: Partial<HeartbeatTask> = {};

  for (const line of lines) {
    const t = line.trim();
    if (t === "## tasks:") { inTasks = true; continue; }
    if (inTasks && t.startsWith("##")) { inTasks = false; continue; }
    if (!inTasks) continue;

    if (t.startsWith("- name:")) {
      if (current.name && current.interval && current.prompt) tasks.push(current as HeartbeatTask);
      current = { name: t.replace("- name:", "").trim() };
    } else if (t.startsWith("interval:")) {
      current.interval = t.replace("interval:", "").trim();
    } else if (t.startsWith("prompt:")) {
      current.prompt = t.replace("prompt:", "").trim();
    }
  }
  if (current.name && current.interval && current.prompt) tasks.push(current as HeartbeatTask);
  return tasks;
}

function parseIntervalMs(s: string): number {
  const n = parseFloat(s);
  if (s.endsWith("d"))  return n * 86400000;
  if (s.endsWith("h"))  return n * 3600000;
  if (s.endsWith("m"))  return n * 60000;
  return n * 60000;
}

function isInActiveHours(content: string): boolean {
  const match = content.match(/## Active hours\s*\n([\d:]+)\s*-\s*([\d:]+)\s+(\S+)/);
  if (!match) return true;
  const [, start, end, tz] = match;
  const now = new Date();
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    d.setHours(h, m, 0, 0);
    return d;
  };
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  return local >= fmt(start) && local <= fmt(end);
}

function isEffectivelyEmpty(content: string): boolean {
  return content.split("\n").every(line => {
    const t = line.trim();
    return !t || t.startsWith("#") || t.startsWith("-  ") || t === "---";
  });
}

// ── Last-run store (in-memory cache, DB is source of truth) ───────────────────
const lastRunCache: Record<string, number> = {};

// ── Call Lyra's real chat API with full tool access ───────────────────────────
async function runTaskWithLyra(prompt: string, taskName: string): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let fullReply = "";
  const context = getTaskContext(taskName);
  const fullPrompt = prompt + context;

  try {
    const res = await fetch(`${baseUrl}/api/lyra/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ADMIN_KEY,
        "x-admin-key": ADMIN_KEY,
        "x-heartbeat-task": taskName,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: fullPrompt }],
        userId: "admin-1",
        autonomous: true,
      }),
    });

    if (!res.ok) {
      return `Task ${taskName} failed: HTTP ${res.status}`;
    }

    // Stream the response and collect text
    const reader = res.body?.getReader();
    if (!reader) return `Task ${taskName}: no response body`;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // SSE format: "0:text\n" or "data: ...\n"
      for (const line of chunk.split("\n")) {
        const clean = line.trim();
        if (clean.startsWith("0:")) {
          try { fullReply += JSON.parse(clean.slice(2)); } catch { fullReply += clean.slice(2); }
        } else if (clean.startsWith("data:")) {
          try {
            const d = JSON.parse(clean.slice(5).trim());
            if (d.type === "text" || d.content) fullReply += d.content ?? d.text ?? "";
          } catch { /* ignore */ }
        }
      }
    }
  } catch (e) {
    return `Task ${taskName} error: ${String(e)}`;
  }

  return fullReply.trim() || `Task ${taskName} completed (no output)`;
}

// ── GET — trigger heartbeat (called by cron) ──────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? ADMIN_KEY;
  if (auth !== cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hbPath = nodePath.join(process.cwd(), "HEARTBEAT.md");
  let content = "";
  try { content = await fsp.readFile(hbPath, "utf8"); } catch { /* no file */ }

  if (!content || isEffectivelyEmpty(content)) {
    return NextResponse.json({ result: "HEARTBEAT_OK", reason: "no content" });
  }

  if (!isInActiveHours(content)) {
    return NextResponse.json({ result: "HEARTBEAT_OK", reason: "outside active hours" });
  }

  const now = Date.now();
  const tasks = parseTasks(content);

  const dueTasks = tasks.filter(t => {
    const due = parseIntervalMs(t.interval);
    const last = lastRunCache[t.name] ?? getLastRun(t.name);
    return (now - last) >= due;
  });

  if (dueTasks.length === 0) {
    return NextResponse.json({ result: "HEARTBEAT_OK", dueTasks: [], timestamp: new Date().toISOString() });
  }

  // Run each due task through the REAL Lyra chat with tools — one at a time
  const results: Array<{ task: string; reply: string; skipped?: boolean }> = [];

  for (const task of dueTasks) {
    // Guardian: check if this task should be skipped
    const { skip, reason } = shouldSkipTask(task.name);
    if (skip) {
      console.log(`[heartbeat] skipping ${task.name}: ${reason}`);
      results.push({ task: task.name, reply: `Skipped: ${reason}`, skipped: true });
      continue;
    }

    console.log(`[heartbeat] running task: ${task.name}`);
    const reply = await runTaskWithLyra(task.prompt, task.name);
    const success = !reply.includes("error") && !reply.includes("failed") && !reply.includes("unavailable");
    lastRunCache[task.name] = Date.now();
    logTaskRun(task.name, reply, success);
    results.push({ task: task.name, reply: reply.slice(0, 500) });

    // Broadcast each completed task to the dashboard
    broadcastPresence({
      type: "speaking",
      message: `[${task.name}] ${reply.slice(0, 100)}`,
      timestamp: Date.now(),
    });
  }

  return NextResponse.json({
    result: "ran",
    dueTasks: dueTasks.map(t => t.name),
    results,
    timestamp: new Date().toISOString(),
  });
}
