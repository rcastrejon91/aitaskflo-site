import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSearchHistory } from "@/lib/lyra/db";

const ADMIN_IDS = ["admin-1", "b9969c91-8bb4-4377-aae5-94e2a8b7f718"];

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId || !ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const searches = getSearchHistory(500);
  return NextResponse.json({ searches });
}
