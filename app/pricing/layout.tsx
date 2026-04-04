import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Simple Plans for Every Need",
  description: "Start free with 10 messages/day. Upgrade to Pro ($29/mo) for unlimited messages and full Lyra access. Cancel anytime.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
