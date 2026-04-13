import { NextRequest, NextResponse } from "next/server";

/**
 * Gumroad OAuth callback
 * After user authorizes, Gumroad redirects here with ?code=xxx
 * We exchange it for an access token and store it in DB
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/shop?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/shop?error=no_code", req.url));
  }

  const clientId = process.env.GUMROAD_CLIENT_ID;
  const clientSecret = process.env.GUMROAD_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/gumroad/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/shop?error=not_configured", req.url));
  }

  try {
    // Exchange code for access token
    const res = await fetch("https://api.gumroad.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await res.json() as { access_token?: string; error?: string };

    if (!data.access_token) {
      return NextResponse.redirect(new URL(`/shop?error=${encodeURIComponent(data.error ?? "token_failed")}`, req.url));
    }

    // Store the token in DB
    const { saveGumroadToken } = await import("@/lib/lyra/db");
    saveGumroadToken(data.access_token);

    return NextResponse.redirect(new URL("/shop?connected=true", req.url));
  } catch (e) {
    return NextResponse.redirect(new URL(`/shop?error=${encodeURIComponent(String(e))}`, req.url));
  }
}
