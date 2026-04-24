/**
 * lib/lyra/printify.ts
 * Printify API integration — print on demand clothes, posters, mugs, etc.
 * Lyra designs → Printify prints & ships → no inventory needed
 * API docs: https://developers.printify.com/
 */

const PRINTIFY_BASE = "https://api.printify.com/v1";

function printifyFetch(path: string, opts: RequestInit = {}) {
  const key = process.env.PRINTIFY_API_KEY;
  if (!key) throw new Error("PRINTIFY_API_KEY not set");
  return fetch(`${PRINTIFY_BASE}${path}`, {
    ...opts,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
}

// ── Shops ─────────────────────────────────────────────────────────────────────

export async function listShops() {
  const res = await printifyFetch("/shops.json");
  return res.json() as Promise<Array<{ id: number; title: string; sales_channel: string }>>;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export async function getCatalogBlueprints() {
  const res = await printifyFetch("/catalog/blueprints.json");
  return res.json() as Promise<Array<{ id: number; title: string; description: string; brand: string; model: string; images: string[] }>>;
}

export async function getBlueprintProviders(blueprintId: number) {
  const res = await printifyFetch(`/catalog/blueprints/${blueprintId}/print_providers.json`);
  return res.json() as Promise<Array<{ id: number; title: string; location: { country: string; region: string } }>>;
}

export async function getBlueprintVariants(blueprintId: number, printProviderId: number) {
  const res = await printifyFetch(`/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`);
  return res.json() as Promise<{ id: number; title: string; variants: Array<{ id: number; title: string; options: Record<string, string>; placeholders: Array<{ position: string; images: Array<{ src: string; height: number; width: number }> }> }> }>;
}

// Popular blueprint IDs for quick access (Printify catalog)
export const POPULAR_BLUEPRINTS = {
  unisex_tshirt: 12,       // Unisex Staple T-Shirt (Gildan 64000)
  premium_tshirt: 145,     // Unisex Heavy Cotton Tee (Gildan 5000)
  hoodie: 77,              // Unisex Heavy Blend Hoodie (Gildan 18500)
  zip_hoodie: 422,         // Unisex Heavy Blend Zip Hoodie
  tote_bag: 77,            // Tote bag
  mug: 56,                 // White Glossy Mug
  poster: 559,             // Enhanced Matte Paper Poster
  sticker: 367,            // Kiss-Cut Stickers
  phone_case: 199,         // Slim Phone Case
  tank_top: 91,            // Unisex Tri-Blend Tank
};

// ── Products ──────────────────────────────────────────────────────────────────

export async function listProducts(shopId: number, page = 1, limit = 10) {
  const res = await printifyFetch(`/shops/${shopId}/products.json?page=${page}&limit=${limit}`);
  return res.json() as Promise<{ current_page: number; data: Array<{ id: string; title: string; description: string; tags: string[]; variants: unknown[]; images: Array<{ src: string; is_default: boolean }> }>; last_page: number; total: number }>;
}

export async function getProduct(shopId: number, productId: string) {
  const res = await printifyFetch(`/shops/${shopId}/products/${productId}.json`);
  return res.json();
}

export async function createProduct(shopId: number, opts: {
  title: string;
  description: string;
  blueprintId: number;
  printProviderId: number;
  variantIds: number[];
  imageUrl: string;        // fal.ai generated design URL
  retailPrice: number;
  tags?: string[];
}) {
  const body = {
    title: opts.title,
    description: opts.description,
    blueprint_id: opts.blueprintId,
    print_provider_id: opts.printProviderId,
    variants: opts.variantIds.map(id => ({
      id,
      price: Math.round(opts.retailPrice * 100), // price in cents
      is_enabled: true,
    })),
    print_areas: [{
      variant_ids: opts.variantIds,
      placeholders: [{
        position: "front",
        images: [{
          id: await uploadImage(opts.imageUrl),
          x: 0.5,
          y: 0.5,
          scale: 1,
          angle: 0,
        }],
      }],
    }],
    tags: opts.tags ?? [],
  };

  const res = await printifyFetch(`/shops/${shopId}/products.json`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateProduct(shopId: number, productId: string, updates: {
  title?: string;
  description?: string;
  tags?: string[];
  variants?: Array<{ id: number; price: number; is_enabled: boolean }>;
}) {
  const res = await printifyFetch(`/shops/${shopId}/products/${productId}.json`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteProduct(shopId: number, productId: string) {
  const res = await printifyFetch(`/shops/${shopId}/products/${productId}.json`, {
    method: "DELETE",
  });
  return res.ok;
}

// Publish product to connected Shopify store
export async function publishProduct(shopId: number, productId: string) {
  const body = {
    title: true,
    description: true,
    images: true,
    variants: true,
    tags: true,
    keyFeatures: true,
    shipping_template: true,
  };
  const res = await printifyFetch(`/shops/${shopId}/products/${productId}/publish.json`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.ok;
}

// ── Images ────────────────────────────────────────────────────────────────────

export async function uploadImage(url: string): Promise<string> {
  const fileName = `lyra-design-${Date.now()}.png`;
  const res = await printifyFetch("/uploads/images.json", {
    method: "POST",
    body: JSON.stringify({ file_name: fileName, url }),
  });
  const data = await res.json() as { id: string };
  return data.id;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function listOrders(shopId: number, page = 1, limit = 10) {
  const res = await printifyFetch(`/shops/${shopId}/orders.json?page=${page}&limit=${limit}`);
  return res.json();
}

export async function getOrder(shopId: number, orderId: string) {
  const res = await printifyFetch(`/shops/${shopId}/orders/${orderId}.json`);
  return res.json();
}

// ── Quick create helper ───────────────────────────────────────────────────────
// Highest-level function: give it a name + image URL, get a published Shopify product

export async function quickCreateMerch(opts: {
  shopId: number;
  title: string;
  description: string;
  imageUrl: string;
  productType: keyof typeof POPULAR_BLUEPRINTS;
  retailPrice: number;
  tags?: string[];
}): Promise<{ success: boolean; productId?: string; shopifyUrl?: string; message: string }> {
  try {
    const blueprintId = POPULAR_BLUEPRINTS[opts.productType];

    // Get print providers for this blueprint
    const providers = await getBlueprintProviders(blueprintId);
    if (!providers.length) {
      return { success: false, message: "No print providers found for this product type" };
    }

    // Pick first provider (usually Monster Digital or similar)
    const provider = providers[0];

    // Get variants
    const variantData = await getBlueprintVariants(blueprintId, provider.id);
    const variants = (variantData as { variants: Array<{ id: number }> }).variants ?? [];
    if (!variants.length) {
      return { success: false, message: "No variants found" };
    }

    // Use first 6 variants (S, M, L, XL, 2XL, 3XL for shirts)
    const variantIds = variants.slice(0, 6).map((v: { id: number }) => v.id);

    // Create product
    const product = await createProduct(opts.shopId, {
      title: opts.title,
      description: opts.description,
      blueprintId,
      printProviderId: provider.id,
      variantIds,
      imageUrl: opts.imageUrl,
      retailPrice: opts.retailPrice,
      tags: opts.tags,
    }) as { id?: string };

    if (!product.id) {
      return { success: false, message: "Failed to create product" };
    }

    // Publish to Shopify
    await publishProduct(opts.shopId, product.id);

    // Get Shopify product URL from published product handle
    let shopifyUrl = "";
    try {
      await new Promise(r => setTimeout(r, 2000)); // brief wait for Shopify sync
      const published = await getProduct(opts.shopId, product.id) as { external?: { handle?: string; id?: string } };
      const handle = published?.external?.handle;
      const shopDomain = process.env.SHOPIFY_SHOP ?? "";
      if (handle && shopDomain) {
        shopifyUrl = `https://${shopDomain}/products/${handle}`;
      }
    } catch { /* URL is optional */ }

    return {
      success: true,
      productId: product.id,
      shopifyUrl,
      message: `Created and published "${opts.title}" (${opts.productType}) at $${opts.retailPrice} via ${provider.title}`,
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : String(e) };
  }
}
