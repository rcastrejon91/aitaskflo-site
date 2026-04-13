import { NextRequest, NextResponse } from "next/server";
import fsp from "fs/promises";
import nodePath from "path";
import Anthropic from "@anthropic-ai/sdk";
import { broadcastPresence } from "@/app/api/lyra/presence/route";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

// ── GET — trigger heartbeat (called by cron) ──────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify cron secret or admin key
  const auth = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? ADMIN_KEY;
  if (auth !== cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Read HEARTBEAT.md
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

  // Find due tasks
  const dueTasks = tasks.filter(t => {
    const due = parseIntervalMs(t.interval);
    return (now - (lastRun[t.name] ?? 0)) >= due;
  });

  // Build the heartbeat prompt — light context only
  const alwaysSection = content.split("## tasks:")[0]
    .replace(/^# Lyra Heartbeat\n/, "")
    .replace(/## Active hours[\s\S]*$/, "")
    .trim();

  const taskSection = dueTasks.length > 0
    ? `\n\nDUE TASKS:\n${dueTasks.map(t => `- ${t.name}: ${t.prompt}`).join("\n")}`
    : "";

  const heartbeatPrompt = `You are Lyra running a heartbeat check. Read the following and act if needed.
If nothing needs attention, reply with exactly: HEARTBEAT_OK

${alwaysSection}${taskSection}

Today: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })}`;

  // Run with lightweight model via Groq (cheap, fast)
  const groqKey = process.env.GROQ_API_KEY;
  let reply = "HEARTBEAT_OK";

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 500,
          temperature: 0.4,
          messages: [{ role: "user", content: heartbeatPrompt }],
        }),
      });
      const data = await res.json() as { choices: Array<{ message: { content: string } }> };
      reply = data.choices?.[0]?.message?.content?.trim() ?? "HEARTBEAT_OK";
    } catch { /* fallback to OK */ }
  } else if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: heartbeatPrompt }],
      });
      reply = (res.content[0] as { text: string }).text.trim();
    } catch { /* fallback */ }
  }

  // Mark tasks as run
  for (const t of dueTasks) lastRun[t.name] = now;

  // Strip HEARTBEAT_OK and check if anything real was said
  const isOk = reply.includes("HEARTBEAT_OK") && reply.replace("HEARTBEAT_OK", "").trim().length < 300;

  if (!isOk && reply !== "HEARTBEAT_OK") {
    // Broadcast to all screens
    broadcastPresence({ type: "speaking", message: reply.slice(0, 80), timestamp: now });

    // Push to admin via SMS if configured
    const adminPhone = process.env.ADMIN_PHONE;
    const twilioSid  = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM;
    if (adminPhone && twilioSid && twilioAuth && twilioFrom) {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: twilioFrom, To: adminPhone, Body: `Lyra: ${reply.slice(0, 280)}` }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    result: isOk ? "HEARTBEAT_OK" : "alert",
    reply: isOk ? undefined : reply,
    dueTasks: dueTasks.map(t => t.name),
    timestamp: new Date().toISOString(),
  });
}
