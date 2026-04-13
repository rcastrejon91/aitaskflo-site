export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSubscription } from "@/lib/lyra/db";
import WriteClient from "./client";

const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];

export default async function WritePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;

  if (!ADMIN_IDS.includes(userId)) {
    const sub = getSubscription(userId);
    if (sub.plan === "free" || sub.status !== "active") redirect("/pricing");
  }

  return <WriteClient userId={userId} />;
}
