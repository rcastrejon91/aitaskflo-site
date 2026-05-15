import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSocialTokens } from "@/lib/lyra/social-tokens";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const userId = (session.user as { id?: string }).id ?? "admin-1";
  const accounts = listSocialTokens(userId);
  return NextResponse.json({ accounts });
}
