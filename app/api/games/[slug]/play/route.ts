import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/lyra/db";
import { incrementPlayCount } from "@/lib/lyra/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Increment on new games table if the slug exists there
  const db = getDb();
  if (db) {
    try {
      const exists = db.prepare("SELECT id FROM games WHERE slug = ?").get(slug);
      if (exists) {
        db.prepare("UPDATE games SET play_count = play_count + 1 WHERE slug = ?").run(slug);
        return NextResponse.json({ ok: true });
      }
    } catch { /* fall through */ }
  }

  // Fall back to legacy marketplace_games
  incrementPlayCount(slug);
  return NextResponse.json({ ok: true });
}
