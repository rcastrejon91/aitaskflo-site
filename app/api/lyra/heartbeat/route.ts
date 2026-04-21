import { NextRequest, NextResponse } from "next/server";
import fsp from "fs/promises";
import nodePath from "path";
import { broadcastPresence } from "@/app/api/lyra/presence/route";

const ADMIN_KEY = process.env.ADMIN_PASSWORD ?? "";

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

// ── Last-run store (in-memory, survives process lifetime) ─────────────────────
const lastRun: Record<string, number> = {};

// ── Call Lyra's real chat API with full tool access ───────────────────────────
async function runTaskWithLyra(prompt: string, taskName: string): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let fullReply = "";

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
        messages: [{ role: "user", content: prompt }],
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
    return (now - (lastRun[t.name] ?? 0)) >= due;
  });

  if (dueTasks.length === 0) {
    return NextResponse.json({ result: "HEARTBEAT_OK", dueTasks: [], timestamp: new Date().toISOString() });
  }

  // Run each due task through the REAL Lyra chat with tools — one at a time
  const results: Array<{ task: string; reply: string }> = [];

  for (const task of dueTasks) {
    console.log(`[heartbeat] running task: ${task.name}`);
    const reply = await runTaskWithLyra(task.prompt, task.name);
    lastRun[task.name] = Date.now();
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
