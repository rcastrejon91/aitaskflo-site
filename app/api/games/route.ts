import { NextRequest, NextResponse } from "next/server";
import { listMarketplaceGames, saveMarketplaceGame } from "@/lib/lyra/db";

export async function GET(req: NextRequest) {
  const sort = (req.nextUrl.searchParams.get("sort") ?? "trending") as "trending" | "newest" | "top_rated";
  const games = listMarketplaceGames(sort, 60);
  return NextResponse.json({ games });
}

export async function POST(req: NextRequest) {
  // Internal endpoint — only callable server-side or with admin key
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json() as { slug: string; title: string; genre: string; engine: string; concept?: string; thumbnail_url?: string };
  const game = saveMarketplaceGame(body);
  if (!game) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  return NextResponse.json({ game });
}
