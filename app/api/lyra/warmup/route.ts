import { NextResponse } from "next/server";
import { distillTrendsToLearnings } from "@/lib/lyra/trends";

// Track last distill so we only run once per day even if warmup is hit frequently
let lastDistill = 0;

export async function POST() {
  const now = Date.now();
  if (now - lastDistill > 24 * 3600 * 1000) {
    lastDistill = now;
    // Fire and forget — don't block the warmup response
    distillTrendsToLearnings().catch(() => {});
  }
  return NextResponse.json({ status: "ok" });
}
