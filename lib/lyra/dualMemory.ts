/**
 * lib/lyra/dualMemory.ts
 *
 * Two separate memory stores:
 *   ideation_memory — what Lyra planned, approaches considered, what she decided NOT to do
 *   execution_memory — what actually worked, effective tool sequences, per-user learned patterns
 *
 * Both scoped per user_id. Both stored in SQLite (additive — existing memories.ts untouched).
 */

import { randomUUID } from "crypto";
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

export interface IdeationEntry {
  id: string;
  user_id: string;
  task: string;
  approaches: string[];        // what was considered
  decided_not: string[];       // what was explicitly ruled out and why
  reasoning: string;           // final decision rationale
  created_at: string;
}

export interface ExecutionEntry {
  id: string;
  user_id: string;
  task: string;
  tool_sequence: string[];     // ordered list of tools used
  outcome: string;             // what happened
  success: boolean;
  skill_used: string | null;   // skill name if one was invoked
  duration_ms: number | null;
  created_at: string;
}

// ── Ideation Memory ───────────────────────────────────────────────────────────

export function saveIdeation(entry: Omit<IdeationEntry, "id" | "created_at">): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      INSERT INTO ideation_memory (id, user_id, task, approaches, decided_not, reasoning, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      entry.user_id,
      entry.task,
      JSON.stringify(entry.approaches),
      JSON.stringify(entry.decided_not),
      entry.reasoning,
      new Date().toISOString()
    );
  } catch (err) {
    console.error("[DualMemory] saveIdeation error:", err instanceof Error ? err.message : err);
  }
}

export function getRecentIdeations(userId: string, limit = 10): IdeationEntry[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(
      "SELECT * FROM ideation_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(userId, limit) as Array<IdeationEntry & { approaches: string; decided_not: string }>;
    return rows.map((r) => ({
      ...r,
      approaches: JSON.parse(r.approaches),
      decided_not: JSON.parse(r.decided_not),
    }));
  } catch { return []; }
}

export function searchIdeations(userId: string, query: string, limit = 5): IdeationEntry[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT * FROM ideation_memory
      WHERE user_id = ? AND (task LIKE ? OR reasoning LIKE ?)
      ORDER BY created_at DESC LIMIT ?
    `).all(userId, `%${query}%`, `%${query}%`, limit) as Array<IdeationEntry & { approaches: string; decided_not: string }>;
    return rows.map((r) => ({
      ...r,
      approaches: JSON.parse(r.approaches),
      decided_not: JSON.parse(r.decided_not),
    }));
  } catch { return []; }
}

// ── Execution Memory ──────────────────────────────────────────────────────────

export function saveExecution(entry: Omit<ExecutionEntry, "id" | "created_at">): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`
      INSERT INTO execution_memory
        (id, user_id, task, tool_sequence, outcome, success, skill_used, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      entry.user_id,
      entry.task,
      JSON.stringify(entry.tool_sequence),
      entry.outcome,
      entry.success ? 1 : 0,
      entry.skill_used ?? null,
      entry.duration_ms ?? null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error("[DualMemory] saveExecution error:", err instanceof Error ? err.message : err);
  }
}

export function getRecentExecutions(userId: string, limit = 10): ExecutionEntry[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(
      "SELECT * FROM execution_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(userId, limit) as Array<ExecutionEntry & { tool_sequence: string; success: number }>;
    return rows.map((r) => ({
      ...r,
      tool_sequence: JSON.parse(r.tool_sequence),
      success: !!r.success,
    }));
  } catch { return []; }
}

export function getSuccessfulPatterns(userId: string, task: string, limit = 5): ExecutionEntry[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT * FROM execution_memory
      WHERE user_id = ? AND success = 1 AND task LIKE ?
      ORDER BY created_at DESC LIMIT ?
    `).all(userId, `%${task}%`, limit) as Array<ExecutionEntry & { tool_sequence: string; success: number }>;
    return rows.map((r) => ({
      ...r,
      tool_sequence: JSON.parse(r.tool_sequence),
      success: !!r.success,
    }));
  } catch { return []; }
}

export function deleteIdeation(id: string): void {
  const db = getDb();
  if (!db) return;
  try { db.prepare("DELETE FROM ideation_memory WHERE id = ?").run(id); } catch { /* ignore */ }
}

export function deleteExecution(id: string): void {
  const db = getDb();
  if (!db) return;
  try { db.prepare("DELETE FROM execution_memory WHERE id = ?").run(id); } catch { /* ignore */ }
}

// ── Context builders — injected at conversation start ─────────────────────────

export function buildIdeationContext(userId: string, currentTask: string): string {
  const relevant = searchIdeations(userId, currentTask.split(" ").slice(0, 5).join(" "), 3);
  if (!relevant.length) return "";
  const lines = relevant.map((e) => {
    const notDone = e.decided_not.length ? `\n  ✗ Decided not to: ${e.decided_not.join("; ")}` : "";
    return `• [${e.created_at.slice(0, 10)}] ${e.task}${notDone}\n  → ${e.reasoning}`;
  });
  return `\n\n── Past Planning (ideation memory) ──\n${lines.join("\n")}\n`;
}

export function buildExecutionContext(userId: string, currentTask: string): string {
  const patterns = getSuccessfulPatterns(userId, currentTask.split(" ").slice(0, 5).join(" "), 3);
  if (!patterns.length) return "";
  const lines = patterns.map((e) =>
    `• [${e.created_at.slice(0, 10)}] ${e.task} → Tools: ${e.tool_sequence.join(" → ")}`
  );
  return `\n\n── What Worked Before (execution memory) ──\n${lines.join("\n")}\n`;
}
