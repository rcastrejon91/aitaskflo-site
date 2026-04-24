import { NextRequest, NextResponse } from "next/server";
import fsp from "fs/promises";
import nodePath from "path";
import { broadcastPresence } from "@/app/api/lyra/presence/route";
import { getDb as getMainDb } from "@/lib/lyra/db";

const ADMIN_KEY = process.env.ADMIN_PASSWORD ?? "";

// ── Guardian: JSON file-backed task history (survives restarts, no DB dep) ────

const GUARDIAN_FILE = nodePath.join(
  process.env.APP_DIR ?? process.cwd(),
  "data", "heartbeat-guardian.json"
);

interface TaskRecord { ran_at: number; result: string; success: boolean; }
interface GuardianState { tasks: Record<string, TaskRecord[]>; }

function readGuardian(): GuardianState {
  try {
    const raw = require("fs").readFileSync(GUARDIAN_FILE, "utf8");
    return JSON.parse(raw) as GuardianState;
  } catch { return { tasks: {} }; }
}

function writeGuardian(state: GuardianState) {
  try {
    require("fs").writeFileSync(GUARDIAN_FILE, JSON.stringify(state, null, 2));
  } catch { /* ignore */ }
}

function logTaskRun(task: string, result: string, success: boolean) {
  const state = readGuardian();
  if (!state.tasks[task]) state.tasks[task] = [];
  state.tasks[task].unshift({ ran_at: Date.now(), result: result.slice(0, 500), success });
  state.tasks[task] = state.tasks[task].slice(0, 10); // keep last 10
  writeGuardian(state);
}

function getTaskContext(task: string): string {
  const state = readGuardian();
  const rows = (state.tasks[task] ?? []).slice(0, 3);
  if (rows.length === 0) return "";
  const lines = rows.map(r => {
    const ago = Math.round((Date.now() - r.ran_at) / 60000);
    const status = r.success ? "✅" : "❌";
    return `${status} ${ago}m ago: ${r.result.slice(0, 150)}`;
  });
  return `\n\n[Guardian context for ${task}]\nLast ${rows.length} run(s):\n${lines.join("\n")}\nDon't repeat what already worked. Fix what failed.`;
}

function shouldSkipTask(task: string): { skip: boolean; reason: string } {
  const state = readGuardian();
  const recent = (state.tasks[task] ?? []).filter(r => r.ran_at > Date.now() - 3600000).slice(0, 3);
  if (recent.length >= 3 && recent.every(r => !r.success)) {
    return { skip: true, reason: "3 consecutive failures in last hour" };
  }
  return { skip: false, reason: "" };
}

function getLastRun(task: string): number {
  const state = readGuardian();
  return state.tasks[task]?.[0]?.ran_at ?? 0;
}

// Pull relevant skills + learnings to inject into task context
function getLyraKnowledge(task: string): string {
  const db = getMainDb();
  if (!db) return "";
  try {
    const keywords = task.split(/[-_]/).filter(w => w.length > 3);
    const sections: string[] = [];

    const skillRows = db.prepare(
      "SELECT name, description FROM skills WHERE status = 'active' LIMIT 5"
    ).all() as Array<{ name: string; description: string }>;
    if (skillRows.length > 0) {
      const relevant = skillRows.filter(s =>
        keywords.some(k => s.name.includes(k) || s.description.toLowerCase().includes(k))
      ).slice(0, 2);
      const toUse = relevant.length > 0 ? relevant : skillRows.slice(0, 2);
      sections.push("Skills you have:\n" + toUse.map(s => `• ${s.name}: ${s.description}`).join("\n"));
    }

    const learnings = db.prepare(
      "SELECT content FROM lyra_learnings ORDER BY created_at DESC LIMIT 3"
    ).all() as Array<{ content: string }>;
    if (learnings.length > 0) {
      sections.push("Recent learnings:\n" + learnings.map(l => `• ${String(l.content).slice(0, 120)}`).join("\n"));
    }

    if (sections.length === 0) return "";
    return "\n\n[Lyra's knowledge bank]\n" + sections.join("\n\n");
  } catch { return ""; }
}

function logRlEpisode(task: string, result: string, success: boolean) {
  const db = getMainDb();
  if (!db) return;
  try {
    const reward = success ? 1.0 : 0.0;
    db.prepare(`INSERT INTO rl_episodes (id, task, agent_name, rollout, terminal_state, reward_task, reward_total, created_at)
      VALUES (?, ?, 'lyra-heartbeat', ?, ?, ?, ?, datetime('now'))`)
      .run(Math.random().toString(36).slice(2), task, result.slice(0, 300),
        success ? "success" : "failure", reward, reward);
  } catch { /* ignore */ }
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
  const knowledge = getLyraKnowledge(taskName);
  const fullPrompt = prompt + context + knowledge;

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
    logRlEpisode(task.name, reply, success);
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
