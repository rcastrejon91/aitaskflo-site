import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";
import { auth } from "@/auth";
import { getSubscription, upsertSubscription } from "@/lib/lyra/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { plan } = await req.json() as { plan: PlanKey };
    const planData = PLANS[plan];
    if (!planData || plan === "free") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!planData.stripePriceId) {
      return NextResponse.json({ error: "Plan not configured — add STRIPE_PRO_PRICE_ID / STRIPE_BUSINESS_PRICE_ID to env" }, { status: 500 });
    }

    const sub = getSubscription(userId);
    let customerId = sub.stripe_customer_id ?? undefined;

    // Create Stripe customer if needed
    if (!customerId) {
      const email = (session!.user as { email?: string })?.email ?? undefined;
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
      upsertSubscription({ user_id: userId, stripe_customer_id: customerId });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: planData.stripePriceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/lyra?upgraded=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: { userId, plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[Stripe checkout]", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
