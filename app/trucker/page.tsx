import { auth } from "@/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const TruckerChat = dynamic(() => import("@/components/trucker/TruckerChat"), { ssr: false });

export default async function TruckerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/trucker");

  return <TruckerChat />;
}
