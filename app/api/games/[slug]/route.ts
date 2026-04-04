import { NextRequest, NextResponse } from "next/server";
import { getMarketplaceGame, setGameHidden, setGameFeatured } from "@/lib/lyra/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getMarketplaceGame(slug);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ game });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json() as { hidden?: boolean; featured?: boolean };
  if (body.hidden !== undefined) setGameHidden(slug, body.hidden);
  if (body.featured !== undefined) setGameFeatured(slug, body.featured);
  return NextResponse.json({ ok: true });
}
