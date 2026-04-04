import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSubscription } from "@/lib/lyra/db";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your AITaskFlo account and subscription.",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const userId = (session.user as { id?: string }).id ?? "";
  const sub = getSubscription(userId);

  return <AccountClient user={session.user} subscription={sub} />;
}
