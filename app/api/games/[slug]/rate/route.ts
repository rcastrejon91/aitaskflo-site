import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/lyra/db";
import { rateGame, getUserRating } from "@/lib/lyra/db";

// ── GET — return the authenticated user's rating for this game ────────────────

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ stars: null });

  const userId = session.user.email;

  // Check new games table first
  const db = getDb();
  if (db) {
    try {
      const exists = db.prepare("SELECT id FROM games WHERE slug = ?").get(slug);
      if (exists) {
        const row = db.prepare(
          "SELECT stars FROM games_ratings WHERE game_slug = ? AND user_id = ?"
        ).get(slug, userId) as { stars: number } | undefined;
        return NextResponse.json({ stars: row?.stars ?? null });
      }
    } catch { /* fall through */ }
  }

  // Fall back to legacy (fingerprint-based) rating — return null for auth users on legacy games
  const stars = getUserRating(slug, userId);
  return NextResponse.json({ stars });
}

// ── POST — upsert a rating ────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stars } = await req.json() as { stars: number };
  if (!stars || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be 1-5" }, { status: 400 });
  }

  const userId = session.user.email;
  const db = getDb();

  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Check if slug is in new games table
  try {
    const exists = db.prepare("SELECT id FROM games WHERE slug = ?").get(slug);
    if (exists) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO games_ratings (game_slug, user_id, stars, rated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(game_slug, user_id) DO UPDATE SET stars = excluded.stars, rated_at = excluded.rated_at
      `).run(slug, userId, stars, now);

      const stats = db.prepare(
        "SELECT AVG(stars) as avg, COUNT(*) as cnt FROM games_ratings WHERE game_slug = ?"
      ).get(slug) as { avg: number; cnt: number };

      const avg_rating = Math.round(stats.avg * 10) / 10;
      db.prepare(
        "UPDATE games SET avg_rating = ?, rating_count = ? WHERE slug = ?"
      ).run(avg_rating, stats.cnt, slug);

      return NextResponse.json({ avg_rating, rating_count: stats.cnt });
    }
  } catch (err) {
    console.error("[rate] error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  // Fall back to legacy fingerprint-based rating
  const result = rateGame(slug, userId, stars);
  if (!result) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json(result);
}
