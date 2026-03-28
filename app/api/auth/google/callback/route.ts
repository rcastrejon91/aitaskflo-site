import { NextRequest, NextResponse } from "next/server";
import { saveGoogleTokens } from "@/lib/lyra/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/lyra?google_error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/lyra?google_error=missing_params", req.url));
  }

  let userId: string;
  try {
    userId = Buffer.from(state, "base64").toString("utf8");
  } catch {
    return NextResponse.redirect(new URL("/lyra?google_error=invalid_state", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/lyra?google_error=not_configured", req.url));
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Google OAuth callback] Token exchange failed:", res.status, errText);
      return NextResponse.redirect(new URL("/lyra?google_error=token_exchange_failed", req.url));
    }

    const data = await res.json();

    saveGoogleTokens(userId, {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
      scopes: data.scope ?? null,
    });

    return NextResponse.redirect(new URL("/lyra?google_connected=true", req.url));
  } catch (err) {
    console.error("[Google OAuth callback] Error:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL("/lyra?google_error=server_error", req.url));
  }
}
