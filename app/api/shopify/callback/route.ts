/**
 * app/api/shopify/callback/route.ts
 * Step 2 of Shopify OAuth — exchange code for access token, save it
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { saveShopToken } from "@/lib/lyra/shopify";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const shop = searchParams.get("shop");
  const code = searchParams.get("code");

  if (!shop || !code) {
    return new Response("Missing shop or code", { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return new Response("Failed to get access token", { status: 500 });
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  // Get user session to associate store with user
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id ?? "admin-1";

  // Save token
  saveShopToken(userId, shop, access_token);

  // Redirect to Lyra chat with success message
  return Response.redirect(`${process.env.NEXTAUTH_URL}/?shopify_connected=${encodeURIComponent(shop)}`);
}
