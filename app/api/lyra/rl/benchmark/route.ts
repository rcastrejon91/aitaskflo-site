import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/lyra/db";

export async function GET(_req: NextRequest) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const totalEpisodes = (db.prepare("SELECT COUNT(*) as n FROM rl_episodes WHERE terminal_state != 'running'").get() as { n: number }).n;
  const avgReward = (db.prepare("SELECT AVG(reward_total) as r FROM rl_episodes WHERE reward_total IS NOT NULL").get() as { r: number | null }).r ?? 0;

  const byAgent = db.prepare(`
    SELECT agent_name,
           COUNT(*) as episodes,
           AVG(reward_total) as avg_reward,
           AVG(reward_task) as avg_task_completion,
           AVG(reward_quality) as avg_quality,
           AVG(reward_tool) as avg_tool_precision,
           AVG(total_iterations) as avg_iterations,
           AVG(wall_ms) as avg_wall_ms,
           SUM(CASE WHEN terminal_state = 'success' THEN 1 ELSE 0 END) as successes
    FROM rl_episodes WHERE reward_total IS NOT NULL
    GROUP BY agent_name ORDER BY avg_reward DESC
  `).all();

  const rewardOverTime = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as date,
           AVG(reward_total) as avg_reward,
           COUNT(*) as episodes
    FROM rl_episodes WHERE reward_total IS NOT NULL
    GROUP BY strftime('%Y-%m-%d', created_at)
    ORDER BY date ASC LIMIT 30
  `).all();

  const policies = db.prepare("SELECT version, baseline_reward, champion_reward, status, created_at FROM rl_policies ORDER BY version DESC LIMIT 10").all();

  return NextResponse.json({
    summary: { totalEpisodes, avgReward },
    byAgent,
    rewardOverTime,
    policies,
    generatedAt: new Date().toISOString(),
  });
}
