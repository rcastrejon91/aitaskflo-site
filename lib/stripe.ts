import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    messagesPerDay: 10,
    stripePriceId: null,
    features: ["10 messages/day", "Basic tools", "Memory"],
  },
  pro: {
    name: "Pro",
    price: 29,
    messagesPerDay: Infinity,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    features: ["Unlimited messages", "All tools", "Priority routing", "Full memory", "CRM"],
  },
  business: {
    name: "Business",
    price: 49,
    messagesPerDay: Infinity,
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? null,
    features: ["Everything in Pro", "API access", "Multiple users", "Analytics", "Priority support"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
