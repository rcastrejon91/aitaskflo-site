/**
 * POST /api/slack/drama
 * Trigger a drama session manually or via cron
 * Body: { channel?, count?, context?, secret? }
 */

import { NextRequest, NextResponse } from "next/server";
import { runDramaSession, announceSale, announceNewProduct } from "@/lib/lyra/slack-team";

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

  // Auth check
  if (body.secret !== process.env.CRON_SECRET && req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channel = body.channel ?? process.env.SLACK_DRAMA_CHANNEL ?? "general";

  try {
    // Event-driven posts
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

    // Regular drama session
    const result = await runDramaSession({
      channel,
      postsCount: body.count ?? 3,
      context: body.context,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
