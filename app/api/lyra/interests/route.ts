import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserInterests, backfillAllUsers } from "@/lib/lyra/interests";

/** GET /api/lyra/interests — returns the current user's interest profile */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = getUserInterests(userId);
  return NextResponse.json(profile ?? { userId, interests: [], weights: {} });
}

/** POST /api/lyra/interests/backfill — admin-only one-time backfill */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-admin-key") ?? req.headers.get("x-api-key");
  const isAdmin = apiKey === process.env.ADMIN_PASSWORD || apiKey === process.env.ADMIN_KEY;
  if (!isAdmin) {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    // Non-admin: backfill only their own profile
    const { backfillUserInterests } = await import("@/lib/lyra/interests");
    const result = backfillUserInterests(userId);
    return NextResponse.json(result);
  }

  // Admin: backfill all users
  const result = backfillAllUsers();
  return NextResponse.json(result);
}
