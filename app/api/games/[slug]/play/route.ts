import { NextRequest, NextResponse } from "next/server";
import { incrementPlayCount } from "@/lib/lyra/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  incrementPlayCount(slug);
  return NextResponse.json({ ok: true });
}
