/**
 * GET  /api/slack/drama?key=... — Vercel cron trigger
 * POST /api/slack/drama         — Manual trigger or event-driven
 * Body: { channel?, count?, context?, secret?, event?, productName?, amount?, platform?, productType?, price? }
 */

import { NextRequest, NextResponse } from "next/server";
import { runDramaSession, announceSale, announceNewProduct } from "@/lib/lyra/slack-team";

// Vercel cron hits GET — run a drama session automatically
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (key !== process.env.CRON_SECRET && req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const channel = process.env.SLACK_DRAMA_CHANNEL ?? "general";
  try {
    const result = await runDramaSession({ channel, postsCount: 4 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    secret?: string;
    channel?: string;
    count?: number;
    context?: string;
    event?: "sale" | "new_product";
    productName?: string;
    amount?: number;
    platform?: string;
    productType?: string;
    price?: number;
  };

  if (body.secret !== process.env.CRON_SECRET && req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channel = body.channel ?? process.env.SLACK_DRAMA_CHANNEL ?? "general";

  try {
    if (body.event === "sale" && body.productName) {
      await announceSale({
        channel,
        productName: body.productName,
        amount: body.amount ?? 0,
        platform: body.platform ?? "Gumroad",
      });
      return NextResponse.json({ ok: true, event: "sale_announced" });
    }

    if (body.event === "new_product" && body.productName) {
      await announceNewProduct({
        channel,
        productName: body.productName,
        productType: body.productType ?? "product",
        price: body.price ?? 0,
      });
      return NextResponse.json({ ok: true, event: "product_announced" });
    }

    const result = await runDramaSession({
      channel,
      postsCount: body.count ?? 4,
      context: body.context,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
