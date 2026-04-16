import crypto from "crypto";
import { getDb } from "@/lib/lyra/db";
import type { RLEpisode, RLStep } from "./types";

// In-memory episode tracking (cleared on finalize)
const activeEpisodes = new Map<string, { startTime: number; steps: RLStep[] }>();

export function startEpisode(task: string, agentName: string, systemPrompt = ""): string {
  const id = crypto.randomUUID();
  const hash = crypto.createHash("sha256").update(systemPrompt).digest("hex").slice(0, 16);
  activeEpisodes.set(id, { startTime: Date.now(), steps: [] });
  // Insert stub row
  const db = getDb();
  if (db) {
    db.prepare(`INSERT OR IGNORE INTO rl_episodes
      (id, task, agent_name, system_prompt_hash, rollout, total_iterations, wall_ms, terminal_state, created_at)
      VALUES (?, ?, ?, ?, '[]', 0, 0, 'running', ?)
    `).run(id, task.slice(0, 1000), agentName, hash, new Date().toISOString());
  }
  return id;
}

export function recordStep(episodeId: string, step: Omit<RLStep, "step" | "timestamp">): void {
  const ep = activeEpisodes.get(episodeId);
  if (!ep) return;
  ep.steps.push({ ...step, step: ep.steps.length, timestamp: new Date().toISOString() });
}

export function finalizeEpisode(
  episodeId: string,
  terminalState: RLEpisode["terminalState"],
  totalIterations: number
): void {
  const ep = activeEpisodes.get(episodeId);
  if (!ep) return;
  const wallMs = Date.now() - ep.startTime;
  const db = getDb();
  if (db) {
    db.prepare(`UPDATE rl_episodes SET
      rollout = ?, total_iterations = ?, wall_ms = ?, terminal_state = ?
      WHERE id = ?
    `).run(JSON.stringify(ep.steps), totalIterations, wallMs, terminalState, episodeId);
  }
  activeEpisodes.delete(episodeId);
}

export function getEpisode(id: string): RLEpisode | null {
  const db = getDb(); if (!db) return null;
  const row = db.prepare("SELECT * FROM rl_episodes WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    task: row.task as string,
    agentName: row.agent_name as string,
    systemPromptHash: row.system_prompt_hash as string,
    rollout: JSON.parse(row.rollout as string ?? "[]"),
    totalIterations: row.total_iterations as number,
    wallMs: row.wall_ms as number,
    terminalState: row.terminal_state as RLEpisode["terminalState"],
    reward: row.reward_total != null ? {
      taskCompletion: row.reward_task as number,
      responseQuality: row.reward_quality as number,
      efficiency: row.reward_efficiency as number,
      humanPreference: row.reward_human as number,
      toolPrecision: row.reward_tool as number,
      total: row.reward_total as number,
    } : undefined,
    scoredAt: row.scored_at as string | undefined,
    createdAt: row.created_at as string,
  };
}

export function listEpisodes(limit = 50, offset = 0): RLEpisode[] {
  const db = getDb(); if (!db) return [];
  const rows = db.prepare("SELECT * FROM rl_episodes WHERE terminal_state != 'running' ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset) as Record<string, unknown>[];
  return rows.map(row => ({
    id: row.id as string,
    task: row.task as string,
    agentName: row.agent_name as string,
    systemPromptHash: row.system_prompt_hash as string,
    rollout: JSON.parse(row.rollout as string ?? "[]"),
    totalIterations: row.total_iterations as number,
    wallMs: row.wall_ms as number,
    terminalState: row.terminal_state as RLEpisode["terminalState"],
    reward: row.reward_total != null ? {
      taskCompletion: row.reward_task as number,
      responseQuality: row.reward_quality as number,
      efficiency: row.reward_efficiency as number,
      humanPreference: row.reward_human as number,
      toolPrecision: row.reward_tool as number,
      total: row.reward_total as number,
    } : undefined,
    scoredAt: row.scored_at as string | undefined,
    createdAt: row.created_at as string,
  }));
}
