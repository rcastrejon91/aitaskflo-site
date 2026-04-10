import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLearningProfile, updateLearningProfile, formatProfileForDisplay, detectSignals } from "@/lib/lyra/learner";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = getLearningProfile(userId);
  return NextResponse.json({ profile: formatProfileForDisplay(profile) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { message, subject } = body;

  const signals = message ? detectSignals(message) : {};
  const updated = await updateLearningProfile(userId, signals, subject);
  return NextResponse.json({ profile: formatProfileForDisplay(updated) });
}
