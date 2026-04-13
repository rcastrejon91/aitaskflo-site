import { NextResponse } from "next/server";
import { sendDailyText } from "@/lib/lyra/daily-texts";

// Called by cron or manually — no user auth needed, protected by CRON_SECRET
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { slot?: string };
  const result = await sendDailyText(body.slot);

  return NextResponse.json(result);
}

// Also allow GET for easy manual testing
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = new URL(req.url).searchParams.get("secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slot = new URL(req.url).searchParams.get("slot") ?? undefined;
  const result = await sendDailyText(slot);
  return NextResponse.json(result);
}
