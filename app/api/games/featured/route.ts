import { NextResponse } from "next/server";
import { getFeaturedGame } from "@/lib/lyra/db";

export async function GET() {
  const game = getFeaturedGame();
  return NextResponse.json({ game });
}
