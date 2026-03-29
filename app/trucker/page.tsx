import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TruckerClientPage from "./client";

export default async function TruckerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/trucker");

  return <TruckerClientPage />;
}
