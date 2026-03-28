import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    messagesPerDay: 10,
    stripePriceId: null,
    features: ["10 messages/day", "Image generation", "Web search", "Weather lookup", "Basic memory"],
  },
  pro: {
    name: "Pro",
    price: 29,
    messagesPerDay: Infinity,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    features: ["Unlimited messages", "Image generation", "Web search", "Email drafting", "CRM (HubSpot)", "Job search & resume tools", "QR code generation", "Full persistent memory", "Priority routing"],
  },
  business: {
    name: "Business",
    price: 49,
    messagesPerDay: Infinity,
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID ?? null,
    features: ["Everything in Pro", "API access", "Multiple users", "Analytics dashboard", "White-label option", "Priority support", "Custom integrations"],
  },
  agency_starter: {
    name: "Starter",
    price: 497,
    messagesPerDay: Infinity,
    stripePriceId: process.env.STRIPE_AGENCY_STARTER_PRICE_ID ?? null,
    features: ["Up to 5 automations", "Email + calendar automation", "Weekly reporting", "Lyra AI assistant", "Onboarding call"],
  },
  agency_growth: {
    name: "Growth",
    price: 997,
    messagesPerDay: Infinity,
    stripePriceId: process.env.STRIPE_AGENCY_GROWTH_PRICE_ID ?? null,
    features: ["Up to 15 automations", "CRM + pipeline automation", "Custom integrations (2)", "Dedicated Lyra instance", "Bi-weekly strategy calls", "Slack access"],
  },
  agency_full: {
    name: "Agency",
    price: 2497,
    messagesPerDay: Infinity,
    stripePriceId: process.env.STRIPE_AGENCY_FULL_PRICE_ID ?? null,
    features: ["Unlimited automations", "Full business OS build-out", "Custom AI agents", "White-label option", "Weekly strategy sessions", "Priority build queue", "SLA guarantee"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
