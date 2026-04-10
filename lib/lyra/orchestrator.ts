/**
 * lib/lyra/orchestrator.ts
 * Lyra as orchestrator — decomposes user intent, assigns sub-agents,
 * waits for results, synthesizes response.
 *
 * Job queue backed by SQLite agent_jobs table.
 * Durable checkpointing: if server restarts, interrupted jobs resume.
 */

import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { EmailAgent } from "./subagents/EmailAgent";
import { CalendarAgent } from "./subagents/CalendarAgent";
import { ResearchAgent } from "./subagents/ResearchAgent";
import { ContentAgent } from "./subagents/ContentAgent";
import { CodeAgent } from "./subagents/CodeAgent";
import type { AgentTask, AgentResult } from "./subagents/base";

const MAX_RESUME_ATTEMPTS = 2;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(path.join(DATA_DIR, "lyra.db"));
    db.pragma("journal_mode = WAL");
    return db;
  } catch { return null; }
}

// ── Agent registry ────────────────────────────────────────────────────────────

const AGENTS = {
  EmailAgent:    new EmailAgent(),
  CalendarAgent: new CalendarAgent(),
  ResearchAgent: new ResearchAgent(),
  ContentAgent:  new ContentAgent(),
  CodeAgent:     new CodeAgent(),
} as const;

type AgentName = keyof typeof AGENTS;

// ── Job management ────────────────────────────────────────────────────────────

interface JobRow {
  id: string;
  user_id: string;
  task: string;
  assigned_agent: string;
  status: string;
  result: string | null;
  confidence: string;
  checkpoint: string | null;
  iteration: number;
  reflection: string | null;
  resume_attempts: number;
  created_at: string;
  updated_at: string;
}

export function createJob(userId: string, task: string, agentName: AgentName): string {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  if (db) {
    try {
      db.prepare(`
        INSERT INTO agent_jobs (id, user_id, task, assigned_agent, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `).run(id, userId, task, agentName, now, now);
    } catch (err) {
      console.error("[Orchestrator] createJob error:", err instanceof Error ? err.message : err);
    }
  }
  return id;
}

export function getInterruptedJobs(userId: string): JobRow[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT * FROM agent_jobs
      WHERE user_id = ? AND status = 'running' AND resume_attempts < ?
      ORDER BY updated_at DESC
    `).all(userId, MAX_RESUME_ATTEMPTS) as JobRow[];
  } catch { return []; }
}

export function markJobResuming(jobId: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      UPDATE agent_jobs
      SET resume_attempts = resume_attempts + 1, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), jobId);
  } catch { /* ignore */ }
}

export function markJobFailed(jobId: string, reason: string): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      UPDATE agent_jobs SET status = 'failed', result = ?, updated_at = ? WHERE id = ?
    `).run(reason, new Date().toISOString(), jobId);
  } catch { /* ignore */ }
}

export function getJobStatus(jobId: string): JobRow | null {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare("SELECT * FROM agent_jobs WHERE id = ?").get(jobId) as JobRow | null ?? null;
  } catch { return null; }
}

export function listUserJobs(userId: string, limit = 20): JobRow[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT * FROM agent_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(userId, limit) as JobRow[];
  } catch { return []; }
}

// ── Intent decomposition ──────────────────────────────────────────────────────

interface Subtask {
  agent: AgentName;
  instruction: string;
}

async function decomposeIntent(userMessage: string): Promise<Subtask[]> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    // Fallback: simple keyword routing
    return [{ agent: routeByKeyword(userMessage), instruction: userMessage }];
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 400,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Decompose this user request into sub-tasks for specialist agents.

User request: "${userMessage}"

Available agents:
- EmailAgent: Gmail read/draft/send
- CalendarAgent: Google Calendar read/create events
- ResearchAgent: web search, URL reading, news gathering
- ContentAgent: writing, blog posts, social copy, formatting
- CodeAgent: code generation, review, debugging

Reply ONLY with JSON array (1-3 items max):
[{"agent": "AgentName", "instruction": "specific instruction for that agent"}]

If the request is simple and fits one agent, return a single-item array.
If not clearly multi-agent, return: [{"agent": "ResearchAgent", "instruction": "${userMessage}"}]`,
        }],
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) throw new Error("Decompose API error");
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array found");
    const parsed = JSON.parse(match[0]) as Subtask[];
    if (!Array.isArray(parsed) || !parsed.length) throw new Error("Empty decomposition");
    // Validate agent names
    return parsed.filter((s) => s.agent in AGENTS).slice(0, 3);
  } catch {
    return [{ agent: routeByKeyword(userMessage), instruction: userMessage }];
  }
}

function routeByKeyword(message: string): AgentName {
  const m = message.toLowerCase();
  if (m.includes("email") || m.includes("gmail") || m.includes("inbox") || m.includes("send"))
    return "EmailAgent";
  if (m.includes("calendar") || m.includes("schedule") || m.includes("meeting") || m.includes("event"))
    return "CalendarAgent";
  if (m.includes("code") || m.includes("function") || m.includes("script") || m.includes("debug"))
    return "CodeAgent";
  if (m.includes("write") || m.includes("post") || m.includes("content") || m.includes("draft"))
    return "ContentAgent";
  return "ResearchAgent";
}

// ── Resume interrupted jobs ───────────────────────────────────────────────────

export async function resumeInterruptedJobs(userId: string): Promise<string | null> {
  const interrupted = getInterruptedJobs(userId);
  if (!interrupted.length) return null;

  const job = interrupted[0]; // resume most recent
  if (job.resume_attempts >= MAX_RESUME_ATTEMPTS) {
    markJobFailed(job.id, "Exceeded max resume attempts");
    return `⚠️ A previous task (${job.task.slice(0, 60)}) could not be completed after ${MAX_RESUME_ATTEMPTS} attempts and was marked as failed.`;
  }

  markJobResuming(job.id);
  const agent = AGENTS[job.assigned_agent as AgentName];
  if (!agent) {
    markJobFailed(job.id, "Agent not found");
    return null;
  }

  const task: AgentTask = {
    jobId: job.id,
    userId: job.user_id,
    instruction: job.task,
    context: `RESUMING from checkpoint. Previous reflection: ${job.reflection ?? "none"}`,
  };

  const result = await agent.run(task);
  return formatResult(result, job.task);
}

// ── Main orchestration entry point ────────────────────────────────────────────

export interface OrchestrationResult {
  ran: boolean;
  response: string;
  jobIds: string[];
  usedAgents: string[];
  hasLowConfidence: boolean;
}

/**
 * Determines if a message warrants multi-agent orchestration.
 * Returns null if Lyra should handle it herself (simple chat).
 */
export function shouldOrchestrate(message: string): boolean {
  const triggers = [
    /\b(search|find|look up|research)\b.{5,}\b(and|then|also)\b/i,
    /\b(email|send|reply|draft)\b.+\b(and|then|also)\b/i,
    /\b(schedule|book|create event)\b/i,
    /\b(write|create|generate)\b.{10,}\b(and|then|publish|send|post)\b/i,
    /do (?:all of )?(?:the following|these):/i,
    /\b(step 1|first.*then|after that)\b/i,
  ];
  return triggers.some((t) => t.test(message));
}

export async function orchestrate(
  userId: string,
  userMessage: string
): Promise<OrchestrationResult> {
  const subtasks = await decomposeIntent(userMessage);
  const jobIds: string[] = [];
  const usedAgents: string[] = [];
  const results: AgentResult[] = [];

  for (const subtask of subtasks) {
    const jobId = createJob(userId, subtask.instruction, subtask.agent);
    jobIds.push(jobId);
    usedAgents.push(subtask.agent);

    const task: AgentTask = {
      jobId,
      userId,
      instruction: subtask.instruction,
    };

    const agent = AGENTS[subtask.agent];
    const result = await agent.run(task);
    results.push(result);
  }

  const hasLowConfidence = results.some((r) => r.confidence === "low");
  const response = await synthesizeResults(userMessage, results);

  return { ran: true, response, jobIds, usedAgents, hasLowConfidence };
}

// ── Result synthesis ──────────────────────────────────────────────────────────

async function synthesizeResults(originalRequest: string, results: AgentResult[]): Promise<string> {
  if (results.length === 1) return formatResult(results[0], originalRequest);

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return results.map((r) => `**${r.agentName}:**\n${r.output}`).join("\n\n");
  }

  const summaries = results
    .map((r) => `${r.agentName} (${r.confidence} confidence):\n${r.output.slice(0, 600)}`)
    .join("\n\n---\n\n");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 600,
        temperature: 0.3,
        messages: [{
          role: "user",
          content: `Original user request: "${originalRequest}"\n\nSub-agent results:\n${summaries}\n\nSynthesize these results into a single coherent response to the user. Be concise. If any result has low confidence, note it.`,
        }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error("Synthesis API error");
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? summaries;
  } catch {
    return results.map((r) => `**${r.agentName}:**\n${r.output}`).join("\n\n");
  }
}

function formatResult(result: AgentResult, task: string): string {
  const confidence = result.confidence === "low"
    ? "\n\n⚠️ *Low confidence — I wasn't fully certain about this result. Please verify.*"
    : "";
  return result.output + confidence;
}
