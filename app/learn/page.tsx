export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSubscription } from "@/lib/lyra/db";
import LearnClient from "./client";

export default async function LearnPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];
  const allowFreeAccess = process.env.NODE_ENV !== "production";
  if (!allowFreeAccess && !ADMIN_IDS.includes(userId)) {
    const sub = getSubscription(userId);
    if (sub.plan === "free" || sub.status !== "active") redirect("/pricing");
  }

  return <LearnClient userId={userId} />;
}
