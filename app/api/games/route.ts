import { NextRequest, NextResponse } from "next/server";
import { listGames } from "@/lib/lyra/games";
import { listMarketplaceGames, saveMarketplaceGame } from "@/lib/lyra/db";

export async function GET(req: NextRequest) {
  const sort = (req.nextUrl.searchParams.get("sort") ?? "trending") as "trending" | "newest" | "top_rated";

  // Merge new games table with legacy marketplace_games; new table wins on slug collision
  const games = listGames(sort);
  const legacy = listMarketplaceGames(sort, 60);
  const slugsSeen = new Set(games.map((g) => g.slug));
  const merged = [...games, ...legacy.filter((g) => !slugsSeen.has(g.slug))];

  return NextResponse.json({ games: merged });
}

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json() as { slug: string; title: string; genre: string; engine: string; concept?: string; thumbnail_url?: string };
  const game = saveMarketplaceGame(body);
  if (!game) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  return NextResponse.json({ game });
}
