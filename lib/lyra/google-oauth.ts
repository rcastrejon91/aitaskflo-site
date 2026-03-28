// ── Google OAuth Token Manager ─────────────────────────────────────────────

import { getGoogleTokens as dbGetGoogleTokens, saveGoogleTokens as dbSaveGoogleTokens } from "@/lib/lyra/db";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string | null;
  expires_at: string; // ISO datetime
  scopes?: string | null;
}

export async function getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
  return dbGetGoogleTokens(userId);
}

export async function saveGoogleTokens(userId: string, tokens: GoogleTokens): Promise<void> {
  dbSaveGoogleTokens(userId, tokens);
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = await getGoogleTokens(userId);
  if (!tokens) return null;

  // Check if token is still valid (with 60s buffer)
  const expiresAt = new Date(tokens.expires_at).getTime();
  const now = Date.now();
  if (expiresAt - now > 60_000) {
    return tokens.access_token;
  }

  // Token expired — refresh it
  if (!tokens.refresh_token) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error("[Google OAuth] Token refresh failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const newTokens: GoogleTokens = {
      access_token: data.access_token,
      refresh_token: tokens.refresh_token, // refresh_token not always returned
      expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
      scopes: tokens.scopes,
    };

    await saveGoogleTokens(userId, newTokens);
    return newTokens.access_token;
  } catch (err) {
    console.error("[Google OAuth] Token refresh error:", err instanceof Error ? err.message : err);
    return null;
  }
}
