import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/auth";
import { getSubscription } from "@/lib/lyra/db";

export async function POST() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const sub = getSubscription(userId);
    if (!sub.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found" }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXTAUTH_URL}/lyra`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[Stripe portal]", err);
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
