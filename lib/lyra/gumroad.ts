/**
 * lib/lyra/gumroad.ts
 * Gumroad API v2 — full product lifecycle
 * create, variants/tiers, offer codes, cover image, file attach, sales, profile
 */

const GUMROAD_BASE = "https://api.gumroad.com/v2";

function token() {
  try {
    const { getGumroadToken } = require("@/lib/lyra/db") as typeof import("@/lib/lyra/db");
    const t = getGumroadToken();
    if (t) return t;
  } catch { /* fall through */ }
  const t = process.env.GUMROAD_ACCESS_TOKEN;
  if (t) return t;
  throw new Error("GUMROAD_ACCESS_TOKEN not set — connect Gumroad at /shop");
}

export interface GumroadProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  url: string;
  short_url: string;
  published: boolean;
  sales_count: number;
  revenue: number;
  thumbnail_url?: string;
  custom_permalink?: string;
}

export interface GumroadSale {
  id: string;
  product_name: string;
  price: number;
  created_at: string;
  email: string;
  country?: string;
}

export interface GumroadOfferCode {
  id: string;
  name: string;
  amount_off: number;
  offer_type: string;
  max_purchase_count?: number;
  times_used: number;
}

export interface GumroadVariant {
  id: string;
  title: string;
  options: Array<{ id: string; name: string; price_difference: number }>;
}

// ── Products ───────────────────────────────────────────────────────────────────

export async function listProducts(): Promise<GumroadProduct[]> {
  const res = await fetch(`${GUMROAD_BASE}/products?access_token=${token()}`, {
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json() as { products?: GumroadProduct[] };
  return data.products ?? [];
}

export async function createProduct(opts: {
  name: string;
  description: string;
  price: number;
  currency?: string;
  customPermalink?: string;
  previewUrl?: string; // cover image
}): Promise<GumroadProduct> {
  const body = new URLSearchParams({
    access_token: token(),
    name: opts.name,
    description: opts.description,
    price: String(opts.price),
    currency: opts.currency ?? "usd",
  });
  if (opts.customPermalink) body.set("custom_permalink", opts.customPermalink);
  if (opts.previewUrl) body.set("preview_url", opts.previewUrl);

  const res = await fetch(`${GUMROAD_BASE}/products`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json() as { product?: GumroadProduct; success?: boolean; message?: string };
  if (!data.product) throw new Error(data.message ?? "Gumroad product creation failed");
  return data.product;
}

export async function updateProduct(id: string, fields: Partial<{
  name: string;
  description: string;
  price: number;
  published: boolean;
  previewUrl: string;
  customPermalink: string;
}>): Promise<GumroadProduct> {
  const body = new URLSearchParams({ access_token: token() });
  if (fields.name) body.set("name", fields.name);
  if (fields.description) body.set("description", fields.description);
  if (fields.price !== undefined) body.set("price", String(fields.price));
  if (fields.published !== undefined) body.set("published", String(fields.published));
  if (fields.previewUrl) body.set("preview_url", fields.previewUrl);
  if (fields.customPermalink) body.set("custom_permalink", fields.customPermalink);

  const res = await fetch(`${GUMROAD_BASE}/products/${id}`, {
    method: "PUT",
    body,
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json() as { product?: GumroadProduct };
  if (!data.product) throw new Error("Failed to update product");
  return data.product;
}

export async function enableProduct(id: string): Promise<void> {
  await fetch(`${GUMROAD_BASE}/products/${id}/enable`, {
    method: "PUT",
    body: new URLSearchParams({ access_token: token() }),
    signal: AbortSignal.timeout(10_000),
  });
}

export async function disableProduct(id: string): Promise<void> {
  await fetch(`${GUMROAD_BASE}/products/${id}/disable`, {
    method: "PUT",
    body: new URLSearchParams({ access_token: token() }),
    signal: AbortSignal.timeout(10_000),
  });
}

// ── Variants / Tiers ──────────────────────────────────────────────────────────

export async function createVariantCategory(productId: string, title: string): Promise<string> {
  const body = new URLSearchParams({ access_token: token(), title });
  const res = await fetch(`${GUMROAD_BASE}/products/${productId}/variant_categories`, {
    method: "POST", body, signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json() as { variant_category?: { id: string } };
  return data.variant_category?.id ?? "";
}

export async function createVariantOption(
  productId: string,
  categoryId: string,
  name: string,
  priceDifferenceCents: number
): Promise<void> {
  const body = new URLSearchParams({
    access_token: token(),
    name,
    price_difference: String(priceDifferenceCents),
  });
  await fetch(`${GUMROAD_BASE}/products/${productId}/variant_categories/${categoryId}/variants`, {
    method: "POST", body, signal: AbortSignal.timeout(10_000),
  });
}

export async function createTiers(
  productId: string,
  tiers: Array<{ name: string; priceCents: number }>
): Promise<void> {
  // Create a "Version" variant category then add each tier as an option
  // price_difference is relative to base price
  const categoryId = await createVariantCategory(productId, "Version");
  if (!categoryId) return;
  const basePriceProduct = await listProducts();
  const product = basePriceProduct.find(p => p.id === productId);
  const basePrice = product?.price ?? 0;

  for (const tier of tiers) {
    const diff = tier.priceCents - basePrice;
    await createVariantOption(productId, categoryId, tier.name, diff);
  }
}

// ── Offer codes ───────────────────────────────────────────────────────────────

export async function createOfferCode(
  productId: string,
  opts: {
    name: string;           // e.g. "LAUNCH20"
    amountOff: number;      // percent (20 = 20%) or cents
    offerType?: "percent" | "cents";
    maxUses?: number;
  }
): Promise<GumroadOfferCode> {
  const body = new URLSearchParams({
    access_token: token(),
    name: opts.name,
    amount_off: String(opts.amountOff),
    offer_type: opts.offerType ?? "percent",
  });
  if (opts.maxUses) body.set("max_purchase_count", String(opts.maxUses));

  const res = await fetch(`${GUMROAD_BASE}/products/${productId}/offer_codes`, {
    method: "POST", body, signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json() as { offer_code?: GumroadOfferCode };
  return data.offer_code ?? { id: "", name: opts.name, amount_off: opts.amountOff, offer_type: opts.offerType ?? "percent", times_used: 0 };
}

export async function listOfferCodes(productId: string): Promise<GumroadOfferCode[]> {
  const res = await fetch(`${GUMROAD_BASE}/products/${productId}/offer_codes?access_token=${token()}`, {
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json() as { offer_codes?: GumroadOfferCode[] };
  return data.offer_codes ?? [];
}

// ── File attach ───────────────────────────────────────────────────────────────

export async function addFileToProduct(productId: string, fileUrl: string, filename: string): Promise<void> {
  const body = new URLSearchParams({ access_token: token(), url: fileUrl });
  await fetch(`${GUMROAD_BASE}/products/${productId}/product_files`, {
    method: "POST", body, signal: AbortSignal.timeout(30_000),
  });
  void filename;
}

// ── Custom fields ─────────────────────────────────────────────────────────────

export async function addCustomField(
  productId: string,
  name: string,
  required = false
): Promise<void> {
  const body = new URLSearchParams({
    access_token: token(),
    name,
    required: required ? "true" : "false",
  });
  await fetch(`${GUMROAD_BASE}/products/${productId}/custom_fields`, {
    method: "POST", body, signal: AbortSignal.timeout(10_000),
  });
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function getSales(productId?: string, after?: string): Promise<GumroadSale[]> {
  const params = new URLSearchParams({ access_token: token() });
  if (productId) params.set("product_id", productId);
  if (after) params.set("after", after);
  const res = await fetch(`${GUMROAD_BASE}/sales?${params}`, { signal: AbortSignal.timeout(10_000) });
  const data = await res.json() as { sales?: GumroadSale[] };
  return data.sales ?? [];
}

export async function getRevenueReport(): Promise<{
  totalRevenue: number;
  totalSales: number;
  products: Array<{ name: string; sales: number; revenue: number; url: string }>;
}> {
  const products = await listProducts();
  const totalRevenue = products.reduce((sum, p) => sum + (p.revenue ?? 0), 0);
  const totalSales = products.reduce((sum, p) => sum + (p.sales_count ?? 0), 0);
  return {
    totalRevenue,
    totalSales,
    products: products.map(p => ({
      name: p.name, sales: p.sales_count, revenue: p.revenue, url: p.short_url,
    })),
  };
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function updateProfile(fields: {
  name?: string;
  bio?: string;
  twitter?: string;
  facebook?: string;
}): Promise<void> {
  const body = new URLSearchParams({ access_token: token() });
  if (fields.name) body.set("name", fields.name);
  if (fields.bio) body.set("bio", fields.bio);
  if (fields.twitter) body.set("twitter_handle", fields.twitter);
  if (fields.facebook) body.set("facebook_profile", fields.facebook);
  await fetch(`${GUMROAD_BASE}/user`, { method: "PUT", body, signal: AbortSignal.timeout(10_000) });
}

export async function getProfile(): Promise<{ name: string; bio: string; url: string }> {
  const res = await fetch(`${GUMROAD_BASE}/user?access_token=${token()}`, { signal: AbortSignal.timeout(10_000) });
  const data = await res.json() as { user?: { name: string; bio: string; profile_url: string } };
  return { name: data.user?.name ?? "", bio: data.user?.bio ?? "", url: data.user?.profile_url ?? "" };
}

// ── Full product launch ───────────────────────────────────────────────────────
// One call to build a complete, dressed checkout page

export async function launchProduct(opts: {
  name: string;
  description: string;           // sales copy
  basePrice: number;             // cents
  customPermalink?: string;
  coverImageUrl?: string;
  fileUrl?: string;
  tiers?: Array<{ name: string; priceCents: number }>;
  offerCode?: { name: string; amountOff: number; maxUses?: number };
  customField?: string;          // e.g. "Character name for your custom lore?"
}): Promise<{ product: GumroadProduct; offerCode?: string; shortUrl: string }> {

  // 1. Create the product
  const product = await createProduct({
    name: opts.name,
    description: opts.description,
    price: opts.basePrice,
    customPermalink: opts.customPermalink,
    previewUrl: opts.coverImageUrl,
  });

  // 2. Attach file
  if (opts.fileUrl) {
    await addFileToProduct(product.id, opts.fileUrl, opts.name).catch(() => {});
  }

  // 3. Create tiers if provided
  if (opts.tiers && opts.tiers.length > 1) {
    await createTiers(product.id, opts.tiers).catch(() => {});
  }

  // 4. Create launch offer code
  let offerCodeName: string | undefined;
  if (opts.offerCode) {
    const code = await createOfferCode(product.id, {
      name: opts.offerCode.name,
      amountOff: opts.offerCode.amountOff,
      offerType: "percent",
      maxUses: opts.offerCode.maxUses,
    }).catch(() => null);
    offerCodeName = code?.name;
  }

  // 5. Add custom field
  if (opts.customField) {
    await addCustomField(product.id, opts.customField, false).catch(() => {});
  }

  // 6. Publish
  await enableProduct(product.id).catch(() => {});

  return { product, offerCode: offerCodeName, shortUrl: product.short_url };
}

// ── Posts (Gumroad blog/updates) ───────────────────────────────────────────────

export interface GumroadPost {
  id: string;
  title: string;
  message: string;
  published: boolean;
  published_at: string;
  shown_on_profile: boolean;
  url?: string;
}

export async function createPost(opts: {
  title: string;
  message: string;   // HTML or plain text body
  publishNow?: boolean;
  shownOnProfile?: boolean;
}): Promise<GumroadPost> {
  const t = token();
  const body = new URLSearchParams({
    access_token: t,
    title: opts.title,
    message: opts.message,
    shown_on_profile: String(opts.shownOnProfile ?? true),
    ...(opts.publishNow ? { published_at: new Date().toISOString() } : {}),
  });
  const r = await fetch(`${GUMROAD_BASE}/posts`, { method: "POST", body });
  const data = await r.json() as { success: boolean; post: GumroadPost };
  if (!data.success) throw new Error(`Gumroad post failed: ${JSON.stringify(data)}`);
  return data.post;
}

export async function publishPost(id: string): Promise<void> {
  const t = token();
  const body = new URLSearchParams({
    access_token: t,
    published_at: new Date().toISOString(),
  });
  await fetch(`${GUMROAD_BASE}/posts/${id}`, { method: "PUT", body });
}

export async function listPosts(): Promise<GumroadPost[]> {
  const t = token();
  const r = await fetch(`${GUMROAD_BASE}/posts?access_token=${t}`);
  const data = await r.json() as { success: boolean; posts: GumroadPost[] };
  return data.success ? data.posts : [];
}
