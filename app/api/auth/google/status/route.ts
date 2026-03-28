import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleTokens } from "@/lib/lyra/google-oauth";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ connected: false });

  const tokens = await getGoogleTokens(userId);
  return NextResponse.json({ connected: !!tokens?.access_token });
}
