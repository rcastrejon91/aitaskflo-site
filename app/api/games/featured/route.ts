import { NextResponse } from "next/server";
import { getDb, getFeaturedGame } from "@/lib/lyra/db";
import type { DbGame } from "@/lib/lyra/games";

export async function GET() {
  // Check new games table first
  const db = getDb();
  if (db) {
    try {
      const game = db.prepare(
        "SELECT * FROM games WHERE featured = 1 AND hidden = 0 ORDER BY created_at DESC LIMIT 1"
      ).get() as DbGame | undefined;
      if (game) return NextResponse.json({ game });
    } catch { /* fall through */ }
  }

  // Fall back to legacy marketplace_games
  const game = getFeaturedGame();
  return NextResponse.json({ game: game ?? null });
}
