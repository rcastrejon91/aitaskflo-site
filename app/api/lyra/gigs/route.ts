import { NextResponse } from "next/server";
import { listGigs, getTodaysGigs, getGigStats } from "@/lib/lyra/gigs";

export async function GET() {
  try {
    const gigs = listGigs(50);
    const today = getTodaysGigs();
    const stats = getGigStats();
    return NextResponse.json({
      gigs,
      todayCount: today.length,
      stats: {
        total: stats.total,
        done: stats.done,
        totalRevenue: `$${(stats.totalRevenue / 100).toFixed(2)}`,
      },
    });
  } catch (e) {
    return NextResponse.json({ gigs: [], todayCount: 0, stats: { total: 0, done: 0, totalRevenue: "$0.00" } });
  }
}
