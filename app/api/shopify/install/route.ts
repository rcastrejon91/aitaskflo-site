/**
 * app/api/shopify/install/route.ts
 * Step 1 of Shopify OAuth — redirect merchant to Shopify authorization page
 * Usage: GET /api/shopify/install?shop=mystore.myshopify.com
 */

import { NextRequest } from "next/server";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SCOPES = "read_analytics,read_customers,write_customers,read_price_rules,write_price_rules,read_discounts,write_discounts,write_inventory,read_inventory,read_orders,write_orders,read_products,write_products,read_shipping,write_shipping,read_content,write_content,read_themes,write_themes";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop || !shop.includes(".myshopify.com")) {
    return new Response("Missing or invalid shop parameter", { status: 400 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`;
  const state = Math.random().toString(36).slice(2);

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return Response.redirect(authUrl);
}
