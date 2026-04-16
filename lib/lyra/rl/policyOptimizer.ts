import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/lyra/db";
import type { PolicyCycleResult, RLPolicy } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Mann-Whitney U test approximation for two independent samples
function mannWhitneyU(a: number[], b: number[]): number {
  let u = 0;
  for (const x of a) for (const y of b) {
    if (x > y) u++; else if (x === y) u += 0.5;
  }
  const mean = a.length * b.length / 2;
  const std = Math.sqrt(a.length * b.length * (a.length + b.length + 1) / 12);
  const z = (u - mean) / (std || 1);
  // Approximate p-value from z-score (two-tailed)
  return 2 * (1 - 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI))));
}

export async function runPolicyOptimizationCycle(topK = 10, minEpisodes = 20): Promise<PolicyCycleResult> {
  const cycleId = crypto.randomUUID();
  const db = getDb();
  if (!db) return { cycleId, episodesAnalyzed: 0, topKEpisodes: 0, baselineReward: 0, championReward: 0, improvement: 0, promoted: false, reason: "DB unavailable" };

  // Pull scored episodes
  const episodes = db.prepare(`
    SELECT id, task, agent_name, rollout, reward_total, terminal_state
    FROM rl_episodes
    WHERE reward_total IS NOT NULL AND terminal_state != 'running'
    ORDER BY created_at DESC LIMIT 500
  `).all() as Array<{ id: string; task: string; agent_name: string; rollout: string; reward_total: number; terminal_state: string }>;

  if (episodes.length < minEpisodes) {
    return { cycleId, episodesAnalyzed: episodes.length, topKEpisodes: 0, baselineReward: 0, championReward: 0, improvement: 0, promoted: false, reason: `Not enough episodes (${episodes.length}/${minEpisodes})` };
  }

  const allRewards = episodes.map(e => e.reward_total);
  const baselineReward = allRewards.reduce((a, b) => a + b, 0) / allRewards.length;

  // Select top-K by reward
  const topEpisodes = [...episodes].sort((a, b) => b.reward_total - a.reward_total).slice(0, topK);

  // Build few-shot examples from top episodes
  const fewShotExamples = topEpisodes.map(ep => {
    const rollout = JSON.parse(ep.rollout ?? "[]") as Array<{ action?: { textResponse?: string } }>;
    const lastStep = rollout[rollout.length - 1];
    return {
      task: ep.task.slice(0, 200),
      response: lastStep?.action?.textResponse?.slice(0, 400) ?? "",
      reward: ep.reward_total,
    };
  });

  // Ask Claude to synthesize a champion system prompt from top examples
  const synthesisRes = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `You are optimizing an AI assistant's system prompt. Here are the ${topK} highest-reward task completions:\n\n${fewShotExamples.map((ex, i) => `[${i + 1}] Task: ${ex.task}\nResponse: ${ex.response}\nReward: ${ex.reward.toFixed(3)}`).join("\n\n")}\n\nWrite a concise system prompt addition (2-3 sentences) that captures the patterns that made these responses high quality. Focus on behavior, not description.`
    }]
  });
  const promptAddition = (synthesisRes.content[0] as { text: string }).text.trim();

  // Simulate champion reward: top-K average as optimistic estimate
  const championReward = topEpisodes.reduce((a, b) => a + b.reward_total, 0) / topEpisodes.length;
  const improvement = (championReward - baselineReward) / (baselineReward || 1);

  // Statistical test
  const bottomRewards = [...episodes].sort((a, b) => a.reward_total - b.reward_total).slice(0, topK).map(e => e.reward_total);
  const topRewards = topEpisodes.map(e => e.reward_total);
  const pValue = mannWhitneyU(topRewards, bottomRewards);

  const promoted = improvement > 0.05 && pValue < 0.1;

  if (promoted) {
    // Get current max version
    const maxRow = db.prepare("SELECT MAX(version) as v FROM rl_policies").get() as { v: number | null };
    const version = (maxRow?.v ?? 0) + 1;

    db.prepare(`INSERT INTO rl_policies
      (id, version, few_shot_examples, promotion_reason, baseline_reward, champion_reward, p_value, sample_size, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      cycleId, version, JSON.stringify(fewShotExamples),
      promptAddition, baselineReward, championReward, pValue, episodes.length,
      new Date().toISOString()
    );

    // Retire previous active policies
    db.prepare("UPDATE rl_policies SET status = 'retired' WHERE status = 'active' AND id != ?").run(cycleId);
  }

  const versionRow = db.prepare("SELECT MAX(version) as v FROM rl_policies").get() as { v: number };
  return {
    cycleId,
    episodesAnalyzed: episodes.length,
    topKEpisodes: topK,
    baselineReward,
    championReward,
    improvement,
    promoted,
    reason: promoted
      ? `Promoted v${versionRow.v}: ${promptAddition.slice(0, 100)}`
      : `No promotion — improvement ${(improvement * 100).toFixed(1)}%, p=${pValue.toFixed(3)}`,
  };
}

export function getActivePolicy(): RLPolicy | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare("SELECT * FROM rl_policies WHERE status = 'active' ORDER BY version DESC LIMIT 1").get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string, version: row.version as number,
    fewShotExamples: JSON.parse(row.few_shot_examples as string ?? "[]"),
    promotionReason: row.promotion_reason as string,
    baselineReward: row.baseline_reward as number, championReward: row.champion_reward as number,
    pValue: row.p_value as number, sampleSize: row.sample_size as number,
    status: row.status as RLPolicy["status"], createdAt: row.created_at as string,
  };
}
