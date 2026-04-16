/**
 * app/api/lyra/slack-agents/route.ts
 * Cron endpoint — triggers the Agent OS tick for every pro user with Slack connected.
 * Called every 30 minutes by the server cron.
 *
 * GET /api/lyra/slack-agents?key=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { runAgentOS } from "@/lib/lyra/slack-team";
import { getAllProUsersWithSlack } from "@/lib/lyra/db";

const ADMIN_KEY = process.env.ADMIN_PASSWORD ?? "";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? ADMIN_KEY;
  if (auth !== cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  // Always run for the platform owner (env token)
  const platformRun = await runAgentOS().catch(e => ({ results: [], error: String(e) }));

  // Run for every pro user who has connected their Slack
  const proUsers = getAllProUsersWithSlack();
  const userRuns = await Promise.allSettled(
    proUsers.map(u => runAgentOS(u.slack_bot_token).then(r => ({ userId: u.id, ...r })))
  );

  return NextResponse.json({
    ok: true,
    elapsed_ms: Date.now() - start,
    platform: platformRun,
    users_ran: proUsers.length,
    user_results: userRuns.map((r, i) => ({
      userId: proUsers[i].id,
      ok: r.status === "fulfilled",
      results: r.status === "fulfilled" ? r.value.results : [],
    })),
    timestamp: new Date().toISOString(),
  });
}

// ── POST — let a user save their Slack bot token ──────────────────────────────
export async function POST(req: NextRequest) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { token } = await req.json() as { token?: string };
  if (!token?.startsWith("xoxb-")) {
    return NextResponse.json({ error: "Invalid Slack bot token. Must start with xoxb-" }, { status: 400 });
  }

  // Verify they're on a paid plan
  const { getSubscription, setSlackToken } = await import("@/lib/lyra/db");
  const sub = getSubscription(session.user.id);
  if (sub.plan === "free" || sub.status !== "active") {
    return NextResponse.json({ error: "Slack Agent OS requires a paid plan" }, { status: 403 });
  }

  setSlackToken(session.user.id, token);
  return NextResponse.json({ ok: true, message: "Slack connected. Agents will start running in the next cycle." });
}
