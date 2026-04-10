import type { Metadata } from "next";
import DemoClient from "./client";

export const metadata: Metadata = {
  title: "Try Lyra — aitaskflo.com",
  description: "Chat with Lyra, our self-evolving AI. No account needed — try it free.",
  openGraph: {
    title: "Try Lyra Free",
    description: "Chat with Lyra, our self-evolving AI. No account needed.",
    url: "https://aitaskflo.com/demo",
  },
};

export default function DemoPage() {
  return <DemoClient />;
}
