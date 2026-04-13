import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getSpendStatus,
  setCaps,
  getUnresolvedJournals,
  resolveJournal,
  recordSpend,
  initGovernanceSchema,
} from "@/lib/lyra/governance";

function isAdmin(req: NextRequest, userId?: string): boolean {
  const key = req.headers.get("x-admin-key") ?? req.headers.get("x-api-key");
  return key === process.env.ADMIN_PASSWORD || key === process.env.ADMIN_KEY || (userId?.startsWith("admin-") ?? false);
}

/** GET /api/lyra/governance — spend status + unresolved journals (admin only) */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!isAdmin(req, userId)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  initGovernanceSchema();
  return NextResponse.json({
    spend: getSpendStatus(),
    journals: getUnresolvedJournals(),
  });
}

/** POST /api/lyra/governance — update caps or resolve journals */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!isAdmin(req, userId)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json() as {
    action: "set_caps" | "resolve_journal" | "record_spend";
    daily_usd?: number;
    weekly_usd?: number;
    monthly_usd?: number;
    journal_id?: string;
    service?: string;
    cost_usd?: number;
    label?: string;
  };

  if (body.action === "set_caps") {
    setCaps({
      daily_usd: body.daily_usd,
      weekly_usd: body.weekly_usd,
      monthly_usd: body.monthly_usd,
    });
    return NextResponse.json({ ok: true, spend: getSpendStatus() });
  }

  if (body.action === "resolve_journal" && body.journal_id) {
    resolveJournal(body.journal_id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "record_spend" && body.service && body.cost_usd != null) {
    recordSpend(body.service as "anthropic" | "fal" | "elevenlabs" | "twilio" | "other", body.cost_usd, body.label, false);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
