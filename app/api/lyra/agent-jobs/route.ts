/**
 * /api/lyra/agent-jobs
 * GET  ?jobId=...  — get single job status
 * GET  (no params) — list all jobs for authenticated user
 * DELETE           — cancel a job { jobId }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getJobStatus, listUserJobs, markJobFailed } from "@/lib/lyra/orchestrator";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (jobId) {
    const job = getJobStatus(jobId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if ((job as { user_id: string }).user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ job });
  }

  const jobs = listUserJobs(userId);
  return NextResponse.json({ jobs });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({})) as { jobId?: string };
  if (!body.jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = getJobStatus(body.jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if ((job as { user_id: string }).user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  markJobFailed(body.jobId, "Cancelled by user");
  return NextResponse.json({ success: true });
}
