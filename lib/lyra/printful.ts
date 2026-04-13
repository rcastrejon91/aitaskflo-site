/**
 * lib/lyra/printful.ts
 * Printful API integration — print on demand clothes, posters, mugs, etc.
 * Lyra designs → Printful prints & ships → no inventory needed
 */

const PRINTFUL_BASE = "https://api.printful.com";

function printfulFetch(path: string, opts: RequestInit = {}) {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY not set");
  return fetch(`${PRINTFUL_BASE}${path}`, {
    ...opts,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
}

// ── Product catalog ───────────────────────────────────────────────────────────

export async function getCatalog(categoryId?: number) {
  const path = categoryId ? `/products?category_id=${categoryId}` : "/products";
  const res = await printfulFetch(path);
  const data = await res.json() as { result: unknown[] };
  return data.result ?? [];
}

export async function getProduct(productId: number) {
  const res = await printfulFetch(`/products/${productId}`);
  const data = await res.json() as { result: { product: unknown; variants: unknown[] } };
  return data.result;
}

// Popular product IDs for quick access
export const POPULAR_PRODUCTS = {
  unisex_tshirt: 71,        // Unisex Staple T-Shirt
  premium_tshirt: 145,      // Unisex Heavy Cotton Tee
  hoodie: 146,              // Unisex Heavy Blend Hoodie
  zip_hoodie: 201,          // Unisex Heavy Blend Zip Hoodie
  tote_bag: 75,             // Tote Bag
  mug: 19,                  // White Glossy Mug
  poster_small: 1,          // Poster 18x24
  poster_large: 2,          // Poster 24x36
  phone_case_iphone: 266,   // iPhone case
  sticker: 358,             // Kiss-Cut Stickers
};

// ── Store products ────────────────────────────────────────────────────────────

export async function listStoreProducts(storeId?: string) {
  const path = storeId ? `/store/products?store_id=${storeId}` : "/store/products";
  const res = await printfulFetch(path);
  const data = await res.json() as { result: unknown[] };
  return data.result ?? [];
}

export async function createStoreProduct(opts: {
  name: string;
  description: string;
  imageUrl: string;          // fal.ai generated design
  productType: keyof typeof POPULAR_PRODUCTS;
  retailPrice: number;
  shopifyStoreId?: string;
}) {
  const catalogProductId = POPULAR_PRODUCTS[opts.productType];

  // First get variants for the product
  const productData = await getProduct(catalogProductId);
  const variants = (productData as { variants: Array<{ id: number; name: string }> }).variants?.slice(0, 3) ?? [];

  const body = {
    sync_product: {
      name: opts.name,
      description: opts.description,
      thumbnail: opts.imageUrl,
    },
    sync_variants: variants.map((v) => ({
      retail_price: opts.retailPrice.toFixed(2),
      variant_id: v.id,
      files: [{
        url: opts.imageUrl,
        type: "front",
      }],
    })),
  };

  const res = await printfulFetch("/store/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function listOrders(status?: string) {
  const path = status ? `/orders?status=${status}` : "/orders";
  const res = await printfulFetch(path);
  const data = await res.json() as { result: unknown[] };
  return data.result ?? [];
}

export async function getOrderEstimate(items: Array<{ variant_id: number; quantity: number }>, address: {
  name: string; address1: string; city: string; state_code: string; country_code: string; zip: string;
}) {
  const res = await printfulFetch("/orders/estimate-costs", {
    method: "POST",
    body: JSON.stringify({
      recipient: address,
      items,
    }),
  });
  return res.json();
}

// ── Shipping ──────────────────────────────────────────────────────────────────

export async function getShippingRates(items: Array<{ variant_id: number; quantity: number }>, address: {
  name: string; address1: string; city: string; state_code: string; country_code: string; zip: string;
}) {
  const res = await printfulFetch("/shipping/rates", {
    method: "POST",
    body: JSON.stringify({ recipient: address, items }),
  });
  return res.json();
}
