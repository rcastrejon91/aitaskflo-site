/**
 * GET /api/social/connect?platform=facebook|instagram|tiktok
 * Kicks off the OAuth flow for the requested platform.
 * Signs the state param with HMAC so the callback can verify it wasn't tampered with.
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createHmac, randomBytes } from "crypto";

const BASE = process.env.NEXTAUTH_URL ?? "https://aitaskflo.com";
const REDIRECT = `${BASE}/api/social/callback`;
const SECRET = process.env.NEXTAUTH_SECRET ?? "lyra-secret";

// state = "platform:nonce:hmac" — callback verifies hmac to prevent platform forgery
function signState(platform: string, nonce: string): string {
  const payload = `${platform}:${nonce}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
  return `${payload}:${sig}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const platform = req.nextUrl.searchParams.get("platform");
  const nonce = randomBytes(12).toString("hex");

  if (platform === "facebook" || platform === "instagram") {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) return new Response("FACEBOOK_APP_ID not set in env", { status: 500 });
    const scopes = [
      "pages_manage_posts",
      "pages_read_engagement",
      "instagram_basic",
      "instagram_content_publish",
      "business_management",
    ].join(",");
    const state = signState(platform, nonce);
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${scopes}&state=${encodeURIComponent(state)}`;
    return Response.redirect(url);
  }

  if (platform === "tiktok") {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) return new Response("TIKTOK_CLIENT_KEY not set in env", { status: 500 });
    const scopes = "user.info.basic,video.upload,video.publish";
    const state = signState("tiktok", nonce);
    const url = `https://www.tiktok.com/v2/auth/authorize?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT)}&state=${encodeURIComponent(state)}`;
    return Response.redirect(url);
  }

  return new Response("Unknown platform. Use: facebook, instagram, tiktok", { status: 400 });
}
