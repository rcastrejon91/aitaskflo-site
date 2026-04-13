import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordFeedback, getRecentFeedback } from "@/lib/lyra/feedback";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { rating: number; userMessage: string; assistantMessage: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rating = body.rating === 1 ? 1 : -1;
  recordFeedback(userId, rating, body.userMessage ?? "", body.assistantMessage ?? "");
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  return NextResponse.json(getRecentFeedback(userId, 50));
}
