import { NextRequest, NextResponse } from "next/server";
import { rateGame, getUserRating } from "@/lib/lyra/db";

function getFingerprint(req: NextRequest): string {
  // Use IP + user agent as anonymous fingerprint
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  // Simple hash: first 16 chars of combined string
  return Buffer.from(ip + ua).toString("base64").slice(0, 24);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fingerprint = getFingerprint(req);
  const stars = getUserRating(slug, fingerprint);
  return NextResponse.json({ stars });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { stars } = await req.json() as { stars: number };
  if (!stars || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be 1-5" }, { status: 400 });
  }
  const fingerprint = getFingerprint(req);
  const result = rateGame(slug, fingerprint, stars);
  if (!result) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json(result);
}
