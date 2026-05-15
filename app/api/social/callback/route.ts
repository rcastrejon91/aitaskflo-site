/**
 * GET /api/social/callback
 * Handles OAuth callbacks from Facebook/Instagram and TikTok.
 * Exchanges the code for a token, stores it, redirects to /social.
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createHmac } from "crypto";
import { saveSocialToken } from "@/lib/lyra/social-tokens";

const SECRET = process.env.NEXTAUTH_SECRET ?? "lyra-secret";

function verifyAndExtractPlatform(state: string): string | null {
  const parts = state.split(":");
  if (parts.length !== 3) return null;
  const [platform, nonce, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(`${platform}:${nonce}`).digest("hex").slice(0, 16);
  if (sig !== expected) return null;
  if (!["facebook", "instagram", "tiktok"].includes(platform)) return null;
  return platform;
}

const BASE = process.env.NEXTAUTH_URL ?? "https://aitaskflo.com";
const REDIRECT = `${BASE}/api/social/callback`;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.redirect(`${BASE}/`);

  const userId = (session.user as { id?: string }).id ?? "admin-1";
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "";
  const error = searchParams.get("error");

  if (error) return Response.redirect(`${BASE}/social?error=oauth_error`);
  if (!code) return Response.redirect(`${BASE}/social?error=no_code`);

  const platform = verifyAndExtractPlatform(state);
  if (!platform) return Response.redirect(`${BASE}/social?error=invalid_state`);

  // ── TikTok ──────────────────────────────────────────────────────────────────
  if (platform === "tiktok") {
    const clientKey = process.env.TIKTOK_CLIENT_KEY!;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;

    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT,
      }),
    });

    const data = await res.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      open_id?: string;
    };

    if (!data.access_token) {
      return Response.redirect(`${BASE}/social?error=tiktok_token_failed`);
    }

    // Fetch username
    let username = data.open_id ?? "";
    try {
      const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,username", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const userData = await userRes.json() as { data?: { user?: { display_name?: string; username?: string } } };
      username = userData.data?.user?.username ?? userData.data?.user?.display_name ?? username;
    } catch { /* use open_id as fallback */ }

    saveSocialToken(userId, {
      platform: "tiktok",
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
      username,
    });

    return Response.redirect(`${BASE}/social?connected=tiktok`);
  }

  // ── Facebook / Instagram (Meta Graph API) ───────────────────────────────────
  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT)}&client_secret=${appSecret}&code=${code}`
  );
  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) {
    return Response.redirect(`${BASE}/social?error=meta_token_failed`);
  }

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
  );
  const longData = await longRes.json() as { access_token?: string; expires_in?: number };
  const longToken = longData.access_token ?? tokenData.access_token;

  // Get user's pages (for posting)
  let pageId = "";
  let pageName = "";
  let pageToken = longToken;
  let username = "";
  try {
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`);
    const pagesData = await pagesRes.json() as { data?: Array<{ id: string; name: string; access_token: string }> };
    const page = pagesData.data?.[0];
    if (page) {
      pageId = page.id;
      pageName = page.name;
      pageToken = page.access_token; // page token never expires
    }
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=name&access_token=${longToken}`);
    const meData = await meRes.json() as { name?: string };
    username = meData.name ?? "";
  } catch { /* use what we have */ }

  saveSocialToken(userId, {
    platform: platform as "facebook" | "instagram",
    access_token: pageToken,
    expires_at: longData.expires_in ? new Date(Date.now() + longData.expires_in * 1000).toISOString() : undefined,
    page_id: pageId || undefined,
    page_name: pageName || undefined,
    username,
  });

  return Response.redirect(`${BASE}/social?connected=${platform}`);
}
