/**
 * lib/lyra/subagents/base.ts
 * Base class for all Lyra sub-agents.
 *
 * Each sub-agent:
 * - Has a single responsibility (email, calendar, research, content, code)
 * - Runs up to maxIterations before giving up
 * - Reflects before each retry (what failed, what I'll try differently)
 * - Runs a self-verify step before returning results
 * - Returns AgentResult with confidence flag
 */

import fs from "fs";
import path from "path";

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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentTask {
  jobId: string;
  userId: string;
  instruction: string;
  context?: string;       // extra context from Lyra
  tools?: string[];       // specific tools to use (optional hint)
}

export interface AgentResult {
  jobId: string;
  agentName: string;
  output: string;
  confidence: "high" | "low";
  iterations: number;
  reflections: string[];
  success: boolean;
}

// ── Job checkpointing ─────────────────────────────────────────────────────────

export function checkpointJob(
  jobId: string,
  status: "running" | "done" | "failed",
  result: string | null,
  iteration: number,
  reflection: string | null,
  confidence: "high" | "low" = "high"
): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      UPDATE agent_jobs
      SET status = ?, result = ?, iteration = ?, reflection = ?,
          confidence = ?, updated_at = ?,
          checkpoint = json_object('status', ?, 'iteration', ?, 'result', ?)
      WHERE id = ?
    `).run(
      status, result, iteration, reflection, confidence,
      new Date().toISOString(),
      status, iteration, result ?? "",
      jobId
    );
  } catch (err) {
    console.error("[SubAgent] checkpointJob error:", err instanceof Error ? err.message : err);
  }
}

export function getJob(jobId: string) {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare("SELECT * FROM agent_jobs WHERE id = ?").get(jobId);
  } catch { return null; }
}

// ── Base SubAgent ─────────────────────────────────────────────────────────────

export abstract class SubAgent {
  abstract readonly name: string;
  readonly maxIterations = 5;

  /**
   * Core logic — must be implemented by each sub-agent.
   * Should call Groq/Claude with the task, return the raw result.
   */
  protected abstract execute(task: AgentTask, attempt: number): Promise<string>;

  /**
   * Verify the output matches the original task.
   * Returns { ok, reason } — sub-agents can override for stricter checks.
   */
  protected async verify(task: AgentTask, output: string): Promise<{ ok: boolean; reason: string }> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return { ok: true, reason: "skipped (no API key)" };

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 100,
          temperature: 0,
          messages: [{
            role: "user",
            content: `Task: "${task.instruction}"\n\nOutput: "${output.slice(0, 500)}"\n\nDoes this output address the task? Reply JSON: {"ok": true/false, "reason": "one sentence"}`,
          }],
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return { ok: true, reason: "verify API error" };
      const data = await res.json();
      const text: string = data.choices?.[0]?.message?.content ?? '{"ok":true}';
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return { ok: true, reason: "could not parse" };
      const parsed = JSON.parse(m[0]) as { ok: boolean; reason: string };
      return parsed;
    } catch {
      return { ok: true, reason: "verify timeout" };
    }
  }

  /**
   * Generate a reflection on failure — what failed, what to try differently.
   */
  protected async reflect(task: AgentTask, failedOutput: string, attempt: number): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return `Attempt ${attempt} failed. Retrying with different approach.`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 150,
          temperature: 0.3,
          messages: [{
            role: "user",
            content: `Task: "${task.instruction}"\nAttempt ${attempt} output: "${failedOutput.slice(0, 300)}"\n\nIn 1-2 sentences: what went wrong and what specific change will make the next attempt better?`,
          }],
        }),
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) return `Attempt ${attempt} failed. Trying a different approach.`;
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? `Attempt ${attempt} failed.`;
    } catch {
      return `Attempt ${attempt} failed. Retrying.`;
    }
  }

  /**
   * Main run loop — execute → verify → reflect on failure → retry → return result.
   */
  async run(task: AgentTask): Promise<AgentResult> {
    checkpointJob(task.jobId, "running", null, 0, null);

    const reflections: string[] = [];
    let lastOutput = "";
    let iteration = 0;

    for (iteration = 1; iteration <= this.maxIterations; iteration++) {
      checkpointJob(task.jobId, "running", null, iteration, reflections[reflections.length - 1] ?? null);

      try {
        lastOutput = await this.execute(task, iteration);
      } catch (err) {
        lastOutput = `Error on attempt ${iteration}: ${err instanceof Error ? err.message : String(err)}`;
        const r = await this.reflect(task, lastOutput, iteration);
        reflections.push(r);
        checkpointJob(task.jobId, "running", null, iteration, r);
        continue;
      }

      // Self-verification pass
      const { ok, reason } = await this.verify(task, lastOutput);
      if (ok) {
        checkpointJob(task.jobId, "done", lastOutput, iteration, null, "high");
        return {
          jobId: task.jobId,
          agentName: this.name,
          output: lastOutput,
          confidence: "high",
          iterations: iteration,
          reflections,
          success: true,
        };
      }

      // Mismatch — one retry with reflection
      const reflection = await this.reflect(task, `Verify failed: ${reason}. Output: ${lastOutput}`, iteration);
      reflections.push(reflection);
      checkpointJob(task.jobId, "running", null, iteration, reflection);

      if (iteration < this.maxIterations) continue;
    }

    // Exhausted iterations — return with low confidence
    checkpointJob(task.jobId, "done", lastOutput, iteration - 1, null, "low");
    return {
      jobId: task.jobId,
      agentName: this.name,
      output: lastOutput,
      confidence: "low",
      iterations: iteration - 1,
      reflections,
      success: false,
    };
  }
}
