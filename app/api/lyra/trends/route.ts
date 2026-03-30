import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTrends, getAdminUserList, distillTrendsToLearnings, getLearnings } from "@/lib/lyra/trends";

function isAdmin(userId: string | undefined) {
  return userId?.startsWith("admin-") ?? false;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const action = req.nextUrl.searchParams.get("action") ?? "summary";

  if (action === "summary") {
    return NextResponse.json(getTrends());
  }
  if (action === "users") {
    return NextResponse.json(getAdminUserList());
  }
  if (action === "learnings") {
    return NextResponse.json(getLearnings(undefined, 50));
  }
  if (action === "distill") {
    const insights = await distillTrendsToLearnings();
    return NextResponse.json({ distilled: insights.length, insights });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
