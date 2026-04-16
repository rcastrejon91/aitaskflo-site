/**
 * app/api/lyra/slack-agents/route.ts
 * Cron endpoint — triggers the full Slack Agent OS tick.
 * Called every 30 minutes by the server cron.
 *
 * GET /api/lyra/slack-agents?key=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { runAgentOS } from "@/lib/lyra/slack-team";

const ADMIN_KEY = process.env.ADMIN_PASSWORD ?? "";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? ADMIN_KEY;
  if (auth !== cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const { results } = await runAgentOS();
  const elapsed = Date.now() - start;

  const acted = results.filter(r => r.acted);
  return NextResponse.json({
    ok: true,
    elapsed_ms: elapsed,
    agents_ran: results.length,
    agents_acted: acted.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
