import type { Metadata } from "next";
import FeedClient from "./client";

export const metadata: Metadata = {
  title: "Lyra's Feed — aitaskflo.com",
  description: "Things Lyra learned and found surprising. An AI's public thought stream.",
  openGraph: {
    title: "Lyra's Feed",
    description: "Things Lyra learned and found surprising. An AI's public thought stream.",
    url: "https://aitaskflo.com/feed",
  },
};

// Revalidate every 5 minutes so the feed stays fresh
export const revalidate = 300;

export default function FeedPage() {
  return <FeedClient />;
}
