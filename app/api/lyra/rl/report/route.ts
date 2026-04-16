import { NextResponse } from "next/server";
import { generateReport } from "@/lib/lyra/rl/reportGenerator";

export async function GET() {
  const report = generateReport();
  return new NextResponse(report, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
