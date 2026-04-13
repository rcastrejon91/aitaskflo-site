/**
 * app/api/shopify/webhooks/route.ts
 * Receives real-time events from Shopify stores
 * Lyra reacts automatically — low stock alerts, new orders, etc.
 */

import { NextRequest } from "next/server";
import crypto from "crypto";

const SECRET = process.env.SHOPIFY_API_SECRET!;

function verifyWebhook(body: string, hmacHeader: string): boolean {
  const hash = crypto.createHmac("sha256", SECRET).update(body, "utf8").digest("base64");
  return hash === hmacHeader;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";

  if (!verifyWebhook(body, hmac)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(body); } catch { /* ignore */ }

  // Handle webhook events
  switch (topic) {
    case "orders/create": {
      const order = payload as { name?: string; total_price?: string; email?: string };
      console.log(`[Shopify] New order on ${shop}: ${order.name} — $${order.total_price}`);
      // TODO: send SMS/email alert to store owner
      break;
    }

    case "inventory_levels/update": {
      const inv = payload as { available?: number; inventory_item_id?: string };
      if ((inv.available ?? 0) < 5) {
        console.log(`[Shopify] LOW STOCK on ${shop}: item ${inv.inventory_item_id} has ${inv.available} left`);
        // TODO: trigger Lyra restock alert
      }
      break;
    }

    case "products/create":
    case "products/update": {
      console.log(`[Shopify] Product updated on ${shop}`);
      break;
    }

    case "app/uninstalled": {
      console.log(`[Shopify] App uninstalled from ${shop}`);
      // TODO: clean up tokens
      break;
    }

    // Compliance webhooks (required for App Store)
    case "customers/redact":
    case "customers/data_request":
    case "shop/redact":
      console.log(`[Shopify] Compliance webhook: ${topic} from ${shop}`);
      break;

    default:
      console.log(`[Shopify] Unhandled webhook: ${topic} from ${shop}`);
  }

  return new Response("OK", { status: 200 });
}
