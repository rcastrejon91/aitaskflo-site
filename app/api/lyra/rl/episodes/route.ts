import { NextRequest, NextResponse } from "next/server";
import { listEpisodes } from "@/lib/lyra/rl/episodeCollector";

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");
  const episodes = listEpisodes(Math.min(limit, 200), offset);
  return NextResponse.json({ episodes, count: episodes.length });
}
