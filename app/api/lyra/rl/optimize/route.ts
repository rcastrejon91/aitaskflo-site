import { NextRequest, NextResponse } from "next/server";
import { runPolicyOptimizationCycle } from "@/lib/lyra/rl/policyOptimizer";

const ADMIN_KEY = process.env.ADMIN_PASSWORD ?? "";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-key") ?? "";
  if (auth !== ADMIN_KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runPolicyOptimizationCycle();
  return NextResponse.json(result);
}
