/**
 * lib/lyra/shopify.ts
 * Shopify API integration for Lyra Store Manager
 * Handles OAuth, products, orders, themes, inventory, customers
 */

const SHOPIFY_API_VERSION = "2026-04";

function shopifyFetch(shop: string, token: string, path: string, opts: RequestInit = {}) {
  return fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
      ...(opts.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
}

// ── Store info ────────────────────────────────────────────────────────────────

export async function getShop(shop: string, token: string) {
  const res = await shopifyFetch(shop, token, "/shop.json");
  const data = await res.json() as { shop: Record<string, unknown> };
  return data.shop;
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function listProducts(shop: string, token: string, limit = 20) {
  const res = await shopifyFetch(shop, token, `/products.json?limit=${limit}`);
  const data = await res.json() as { products: unknown[] };
  return data.products ?? [];
}

export async function createProduct(shop: string, token: string, product: {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  variants?: Array<{ price: string; sku?: string; inventory_quantity?: number }>;
  images?: Array<{ src: string }>;
}) {
  const res = await shopifyFetch(shop, token, "/products.json", {
    method: "POST",
    body: JSON.stringify({ product }),
  });
  const data = await res.json() as { product?: Record<string, unknown>; errors?: unknown };
  if (!data.product) throw new Error(`Shopify error: ${JSON.stringify(data.errors ?? data)}`);
  return data.product;
}

export async function updateProduct(shop: string, token: string, productId: string, fields: Record<string, unknown>) {
  const res = await shopifyFetch(shop, token, `/products/${productId}.json`, {
    method: "PUT",
    body: JSON.stringify({ product: { id: productId, ...fields } }),
  });
  const data = await res.json() as { product: Record<string, unknown> };
  return data.product;
}

export async function deleteProduct(shop: string, token: string, productId: string) {
  await shopifyFetch(shop, token, `/products/${productId}.json`, { method: "DELETE" });
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function listOrders(shop: string, token: string, status = "any", limit = 20) {
  const res = await shopifyFetch(shop, token, `/orders.json?status=${status}&limit=${limit}`);
  const data = await res.json() as { orders: unknown[] };
  return data.orders ?? [];
}

export async function getOrder(shop: string, token: string, orderId: string) {
  const res = await shopifyFetch(shop, token, `/orders/${orderId}.json`);
  const data = await res.json() as { order: Record<string, unknown> };
  return data.order;
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function listInventoryLevels(shop: string, token: string, locationId: string) {
  const res = await shopifyFetch(shop, token, `/inventory_levels.json?location_ids=${locationId}`);
  const data = await res.json() as { inventory_levels: unknown[] };
  return data.inventory_levels ?? [];
}

export async function setInventoryLevel(shop: string, token: string, inventoryItemId: string, locationId: string, quantity: number) {
  const res = await shopifyFetch(shop, token, "/inventory_levels/set.json", {
    method: "POST",
    body: JSON.stringify({ location_id: locationId, inventory_item_id: inventoryItemId, available: quantity }),
  });
  return res.json();
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function listCustomers(shop: string, token: string, limit = 20) {
  const res = await shopifyFetch(shop, token, `/customers.json?limit=${limit}`);
  const data = await res.json() as { customers: unknown[] };
  return data.customers ?? [];
}

// ── Discounts ─────────────────────────────────────────────────────────────────

export async function createDiscountCode(shop: string, token: string, opts: {
  code: string;
  valueType: "percentage" | "fixed_amount";
  value: number;
  usageLimit?: number;
  endsAt?: string;
}) {
  // Create price rule first
  const priceRuleRes = await shopifyFetch(shop, token, "/price_rules.json", {
    method: "POST",
    body: JSON.stringify({
      price_rule: {
        title: opts.code,
        target_type: "line_item",
        target_selection: "all",
        allocation_method: "across",
        value_type: opts.valueType,
        value: `-${opts.value}`,
        customer_selection: "all",
        starts_at: new Date().toISOString(),
        ends_at: opts.endsAt,
        usage_limit: opts.usageLimit,
      },
    }),
  });
  const priceRuleData = await priceRuleRes.json() as { price_rule: { id: string } };
  const priceRuleId = priceRuleData.price_rule?.id;
  if (!priceRuleId) throw new Error("Failed to create price rule");

  // Create discount code on that rule
  const discountRes = await shopifyFetch(shop, token, `/price_rules/${priceRuleId}/discount_codes.json`, {
    method: "POST",
    body: JSON.stringify({ discount_code: { code: opts.code } }),
  });
  return discountRes.json();
}

// ── Themes ────────────────────────────────────────────────────────────────────

export async function listThemes(shop: string, token: string) {
  const res = await shopifyFetch(shop, token, "/themes.json");
  const data = await res.json() as { themes: unknown[] };
  return data.themes ?? [];
}

export async function getThemeAsset(shop: string, token: string, themeId: string, assetKey: string) {
  const res = await shopifyFetch(shop, token, `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(assetKey)}`);
  const data = await res.json() as { asset: { value?: string; attachment?: string } };
  return data.asset;
}

export async function updateThemeAsset(shop: string, token: string, themeId: string, assetKey: string, value: string) {
  const res = await shopifyFetch(shop, token, `/themes/${themeId}/assets.json`, {
    method: "PUT",
    body: JSON.stringify({ asset: { key: assetKey, value } }),
  });
  return res.json();
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function getStoreSummary(shop: string, token: string): Promise<{
  totalOrders: number;
  totalRevenue: string;
  productCount: number;
  customerCount: number;
  recentOrders: unknown[];
}> {
  const [ordersData, productsData, customersData] = await Promise.all([
    shopifyFetch(shop, token, "/orders.json?status=any&limit=250").then(r => r.json()) as Promise<{ orders: Array<{ total_price: string }> }>,
    shopifyFetch(shop, token, "/products/count.json").then(r => r.json()) as Promise<{ count: number }>,
    shopifyFetch(shop, token, "/customers/count.json").then(r => r.json()) as Promise<{ count: number }>,
  ]);

  const orders = ordersData.orders ?? [];
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price ?? "0"), 0);

  return {
    totalOrders: orders.length,
    totalRevenue: `$${totalRevenue.toFixed(2)}`,
    productCount: productsData.count ?? 0,
    customerCount: customersData.count ?? 0,
    recentOrders: orders.slice(0, 5),
  };
}

// ── Token storage (SQLite) ────────────────────────────────────────────────────

export function saveShopToken(userId: string, shop: string, accessToken: string): void {
  try {
    const Database = require("better-sqlite3");
    const path = require("path");
    const fs = require("fs");
    const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(path.join(DATA_DIR, "lyra.db"));
    db.pragma("journal_mode = WAL");
    db.prepare(`CREATE TABLE IF NOT EXISTS shopify_tokens (
      user_id TEXT NOT NULL,
      shop TEXT NOT NULL,
      access_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, shop)
    )`).run();
    db.prepare(`INSERT OR REPLACE INTO shopify_tokens (user_id, shop, access_token, created_at) VALUES (?, ?, ?, ?)`)
      .run(userId, shop, accessToken, new Date().toISOString());
  } catch (e) {
    console.error("[Shopify] saveShopToken error:", e);
  }
}

export function getShopToken(userId: string, shop?: string): { shop: string; access_token: string } | null {
  try {
    const Database = require("better-sqlite3");
    const path = require("path");
    const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
    const db = new Database(path.join(DATA_DIR, "lyra.db"));
    if (shop) {
      return db.prepare("SELECT shop, access_token FROM shopify_tokens WHERE user_id = ? AND shop = ?").get(userId, shop) ?? null;
    }
    return db.prepare("SELECT shop, access_token FROM shopify_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId) ?? null;
  } catch { return null; }
}

export function listUserShops(userId: string): Array<{ shop: string }> {
  try {
    const Database = require("better-sqlite3");
    const path = require("path");
    const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
    const db = new Database(path.join(DATA_DIR, "lyra.db"));
    return db.prepare("SELECT shop FROM shopify_tokens WHERE user_id = ? ORDER BY created_at DESC").all(userId) ?? [];
  } catch { return []; }
}
