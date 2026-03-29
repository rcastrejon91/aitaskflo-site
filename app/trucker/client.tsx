"use client";

import dynamic from "next/dynamic";

const TruckerChat = dynamic(() => import("@/components/trucker/TruckerChat"), { ssr: false });

export default function TruckerClientPage() {
  return <TruckerChat />;
}
