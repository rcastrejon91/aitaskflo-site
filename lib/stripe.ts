import Stripe from "stripe";
export { PLANS, type PlanKey } from "./plans";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
