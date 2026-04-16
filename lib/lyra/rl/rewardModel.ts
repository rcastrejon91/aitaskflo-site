import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/lyra/db";
import type { RLEpisode, RewardVector } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WEIGHTS = {
  taskCompletion: 0.40,
  responseQuality: 0.25,
  efficiency: 0.10,
  humanPreference: 0.15,
  toolPrecision: 0.10,
};

// Score task completion: did the agent actually complete the task?
async function scoreTaskCompletion(episode: RLEpisode): Promise<number> {
  if (episode.terminalState === "success") return 1.0;
  if (episode.terminalState === "failure") return 0.0;
  if (episode.terminalState === "timeout") return 0.1;
  // low_confidence: ask Claude Haiku to judge
  const lastStep = episode.rollout[episode.rollout.length - 1];
  if (!lastStep) return 0.3;
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [{
      role: "user",
      content: `Task: "${episode.task}"\nResponse: "${lastStep.action.textResponse.slice(0, 500)}"\n\nDid the agent complete this task? Reply with only a number 0.0-1.0.`
    }]
  });
  const text = (res.content[0] as { text: string }).text.trim();
  return Math.min(1, Math.max(0, parseFloat(text) || 0.3));
}

// Score response quality using LLM-as-judge
async function scoreResponseQuality(episode: RLEpisode): Promise<number> {
  const lastStep = episode.rollout[episode.rollout.length - 1];
  if (!lastStep?.action.textResponse) return 0.0;
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{
      role: "user",
      content: `Rate this AI response on a scale of 0.0 to 1.0 for quality (accuracy, clarity, completeness, helpfulness).
Task: "${episode.task.slice(0, 200)}"
Response: "${lastStep.action.textResponse.slice(0, 800)}"
Reply with ONLY a decimal number between 0.0 and 1.0.`
    }]
  });
  const text = (res.content[0] as { text: string }).text.trim();
  return Math.min(1, Math.max(0, parseFloat(text) || 0.5));
}

// Score efficiency: penalizes wasted iterations
function scoreEfficiency(episode: RLEpisode, maxIterations = 5): number {
  const ratio = episode.totalIterations / maxIterations;
  return Math.max(0, 1 - Math.log(ratio + 1) / Math.log(maxIterations + 1));
}

// Score human preference from lyra_feedback table
function scoreHumanPreference(episode: RLEpisode): number {
  const db = getDb();
  if (!db) return 0.5;
  try {
    const row = db.prepare(`
      SELECT rating FROM lyra_feedback
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(episode.agentName) as { rating: number } | undefined;
    if (!row) return 0.5;
    // Normalize: -1 → 0.0, 0 → 0.5, 1 → 1.0
    return (row.rating + 1) / 2;
  } catch { return 0.5; }
}

// Score tool precision: were tool calls relevant and targeted?
function scoreToolPrecision(episode: RLEpisode): number {
  const allToolCalls = episode.rollout.flatMap(s => s.action.toolCalls);
  if (allToolCalls.length === 0) return 1.0; // No tools needed = precise
  // Penalize if avg tools per iteration > 3 (shotgun approach)
  const avgTools = allToolCalls.length / Math.max(1, episode.totalIterations);
  return Math.max(0, 1 - Math.max(0, avgTools - 3) / 10);
}

export async function scoreEpisode(episode: RLEpisode): Promise<RewardVector> {
  const [taskCompletion, responseQuality] = await Promise.all([
    scoreTaskCompletion(episode),
    scoreResponseQuality(episode),
  ]);
  const efficiency = scoreEfficiency(episode);
  const humanPreference = scoreHumanPreference(episode);
  const toolPrecision = scoreToolPrecision(episode);

  const total =
    WEIGHTS.taskCompletion * taskCompletion +
    WEIGHTS.responseQuality * responseQuality +
    WEIGHTS.efficiency * efficiency +
    WEIGHTS.humanPreference * humanPreference +
    WEIGHTS.toolPrecision * toolPrecision;

  return { taskCompletion, responseQuality, efficiency, humanPreference, toolPrecision, total };
}

export async function scoreAndSaveEpisode(episodeId: string): Promise<RewardVector> {
  const db = getDb();
  if (!db) throw new Error("DB unavailable");

  const row = db.prepare("SELECT * FROM rl_episodes WHERE id = ?").get(episodeId) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Episode ${episodeId} not found`);

  const episode: RLEpisode = {
    id: row.id as string, task: row.task as string, agentName: row.agent_name as string,
    systemPromptHash: row.system_prompt_hash as string,
    rollout: JSON.parse(row.rollout as string ?? "[]"),
    totalIterations: row.total_iterations as number, wallMs: row.wall_ms as number,
    terminalState: row.terminal_state as RLEpisode["terminalState"],
    createdAt: row.created_at as string,
  };

  const reward = await scoreEpisode(episode);

  db.prepare(`UPDATE rl_episodes SET
    reward_task = ?, reward_quality = ?, reward_efficiency = ?,
    reward_human = ?, reward_tool = ?, reward_total = ?, scored_at = ?
    WHERE id = ?
  `).run(reward.taskCompletion, reward.responseQuality, reward.efficiency,
    reward.humanPreference, reward.toolPrecision, reward.total,
    new Date().toISOString(), episodeId);

  return reward;
}
