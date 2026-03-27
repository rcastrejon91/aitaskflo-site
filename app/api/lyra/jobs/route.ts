import { NextRequest, NextResponse } from "next/server";
import { scanJobs } from "@/lib/lyra/jobscan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const keywords = req.nextUrl.searchParams.get("keywords") ?? "";
  const max = parseInt(req.nextUrl.searchParams.get("max") ?? "10", 10) || 10;

  const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const jobs = await scanJobs({ keywords: kwList, maxResults: max });

  return NextResponse.json({ jobs, count: jobs.length, fetched: new Date().toISOString() });
}
