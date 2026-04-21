export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSubscription } from "@/lib/lyra/db";
import BusinessClient from "./client";

const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];
const allowFreeAccess = process.env.NODE_ENV !== "production";

export default async function BusinessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;

  if (!allowFreeAccess && !ADMIN_IDS.includes(userId)) {
    const sub = getSubscription(userId);
    if (sub.plan === "free" || sub.status !== "active") redirect("/pricing");
  }

  return <BusinessClient userId={userId} />;
}
