import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteSocialToken, SocialPlatform } from "@/lib/lyra/social-tokens";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const userId = (session.user as { id?: string }).id ?? "admin-1";
  const { platform } = await req.json() as { platform: SocialPlatform };
  deleteSocialToken(userId, platform);
  return NextResponse.json({ ok: true });
}
