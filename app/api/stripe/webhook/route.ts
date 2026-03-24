import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { upsertSubscription } from "@/lib/lyra/db";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        if (userId && plan) {
          upsertSubscription({
            user_id: userId,
            plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: "active",
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string);
        if (customer.deleted) break;
        const userId = (customer as Stripe.Customer).metadata?.userId;
        if (!userId) break;
        const periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString();
        upsertSubscription({
          user_id: userId,
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_end: periodEnd,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string);
        if (customer.deleted) break;
        const userId = (customer as Stripe.Customer).metadata?.userId;
        if (!userId) break;
        upsertSubscription({ user_id: userId, plan: "free", status: "canceled" });
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe webhook] handler error:", err);
  }

  return NextResponse.json({ received: true });
}
