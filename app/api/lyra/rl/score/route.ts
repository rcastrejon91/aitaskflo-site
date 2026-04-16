import { NextRequest, NextResponse } from "next/server";
import { scoreAndSaveEpisode } from "@/lib/lyra/rl/rewardModel";
import { getDb } from "@/lib/lyra/db";

const ADMIN_KEY = process.env.ADMIN_PASSWORD ?? "";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-key") ?? "";
  if (auth !== ADMIN_KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { episode_id, batch } = await req.json() as { episode_id?: string; batch?: boolean };

  if (batch) {
    // Score all unscored episodes
    const db = getDb();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
    const unscored = db.prepare("SELECT id FROM rl_episodes WHERE reward_total IS NULL AND terminal_state != 'running' LIMIT 100").all() as Array<{ id: string }>;
    const results = await Promise.allSettled(unscored.map(e => scoreAndSaveEpisode(e.id)));
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    return NextResponse.json({ scored: succeeded, failed: results.length - succeeded });
  }

  if (!episode_id) return NextResponse.json({ error: "episode_id required" }, { status: 400 });
  const reward = await scoreAndSaveEpisode(episode_id);
  return NextResponse.json({ reward });
}
