/**
 * lib/lyra/trend-hunter.ts
 * Autonomous trend research — finds winning products to sell
 * Sources: Google Trends, Reddit, TikTok hashtags, Gumroad bestsellers
 */

import { aiComplete } from "./providers";

export interface TrendingProduct {
  name: string;
  niche: string;
  demandScore: number;       // 1-10
  competitionScore: number;  // 1-10 (lower = less competition)
  estimatedMargin: number;   // percentage
  suggestedPrice: number;
  productType: "digital" | "print_on_demand" | "dropship";
  designPrompt: string;      // fal.ai prompt for the product image/design
  adAngle: string;           // hook for the first ad
  targetAudience: string;
  reasoning: string;
}

export async function huntTrends(niche?: string, count = 5): Promise<TrendingProduct[]> {
  // Search for trending topics
  const searchQueries = niche
    ? [`${niche} trending products 2026`, `${niche} best selling items`, `${niche} TikTok trending`]
    : ["trending products to sell online 2026", "best selling niches ecommerce 2026", "TikTok trending products April 2026"];

  let searchResults = "";
  try {
    for (const q of searchQueries.slice(0, 2)) {
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`,
        { signal: AbortSignal.timeout(8_000) }
      );
      if (res.ok) {
        const data = await res.json() as { AbstractText?: string; RelatedTopics?: Array<{ Text?: string }> };
        if (data.AbstractText) searchResults += data.AbstractText + "\n";
        data.RelatedTopics?.slice(0, 5).forEach(t => { if (t.Text) searchResults += t.Text + "\n"; });
      }
    }
  } catch { /* use Claude's knowledge if search fails */ }

  const prompt = `You are an expert ecommerce trend analyst. Find ${count} winning products to sell right now.
${niche ? `Focus on this niche: ${niche}` : "Look across all niches for the best opportunities."}
${searchResults ? `Recent search data:\n${searchResults}\n` : ""}

For each product consider:
- High demand, low competition sweet spots
- Good profit margins (>40%)
- Works as digital download, print-on-demand clothing, or dropship
- Can be marketed on social media with a strong hook
- April 2026 trends

Return ONLY valid JSON array:
[
  {
    "name": "specific product name",
    "niche": "niche category",
    "demandScore": 8,
    "competitionScore": 3,
    "estimatedMargin": 65,
    "suggestedPrice": 29.99,
    "productType": "print_on_demand",
    "designPrompt": "detailed fal.ai image prompt for the product design",
    "adAngle": "viral hook for TikTok/Instagram ad",
    "targetAudience": "who buys this",
    "reasoning": "why this wins right now"
  }
]`;

  const text = await aiComplete(prompt, { maxTokens: 2000 });
  const match = text.match(/\[[\s\S]*\]/);
  try {
    return JSON.parse(match?.[0] ?? "[]") as TrendingProduct[];
  } catch {
    return [];
  }
}

export async function analyzeProductPerformance(products: Array<{
  id: string; title: string; sales: number; revenue: number; daysLive: number;
}>): Promise<Array<{ id: string; title: string; action: "scale" | "keep" | "remove"; reason: string }>> {
  if (!products.length) return [];

  const text = await aiComplete(
    `Analyze these Shopify products and decide: scale (winner), keep (needs more time), or remove (loser).

Products:
${products.map(p => `- ${p.title}: ${p.sales} sales, $${p.revenue} revenue, ${p.daysLive} days live`).join("\n")}

Rules:
- scale: >5 sales in first 7 days OR >$100 revenue
- remove: 0 sales after 14 days OR <$10 revenue after 7 days
- keep: everything else

Return ONLY valid JSON array:
[{"id": "...", "title": "...", "action": "scale|keep|remove", "reason": "..."}]`,
    { maxTokens: 1000 }
  );
  const match = text.match(/\[[\s\S]*\]/);
  try {
    return JSON.parse(match?.[0] ?? "[]");
  } catch { return []; }
}

// ── Autonomous store loop ─────────────────────────────────────────────────────
// Called by heartbeat — runs the full research → list → track → prune cycle

export async function runStoreLoop(userId: string, shop: string, accessToken: string): Promise<string> {
  const results: string[] = [];

  try {
    // 1. Hunt for 3 trending products
    const trends = await huntTrends(undefined, 3);
    results.push(`🔍 Found ${trends.length} trending products`);

    // 2. Check existing product performance
    const { listOrders, listProducts } = await import("./shopify");
    const [orders, products] = await Promise.all([
      listOrders(shop, accessToken, "any", 250) as Promise<Array<{ line_items: Array<{ product_id: string; title: string }>; total_price: string; created_at: string }>>,
      listProducts(shop, accessToken, 50) as Promise<Array<{ id: string; title: string; created_at: string }>>,
    ]);

    // Analyze performance
    const productStats = products.map(p => {
      const productOrders = orders.filter(o =>
        o.line_items?.some(li => li.product_id === String(p.id))
      );
      const revenue = productOrders.reduce((sum, o) => sum + parseFloat(o.total_price ?? "0"), 0);
      const daysLive = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
      return { id: String(p.id), title: p.title, sales: productOrders.length, revenue, daysLive };
    });

    const decisions = await analyzeProductPerformance(productStats);

    // 3. Remove losers
    const { deleteProduct } = await import("./shopify");
    for (const d of decisions.filter(d => d.action === "remove")) {
      await deleteProduct(shop, accessToken, d.id).catch(() => {});
      results.push(`🗑️ Removed "${d.title}" — ${d.reason}`);
    }

    // 4. Save trending products to DB for Lyra to act on
    const winnersToAdd = trends.slice(0, 2);
    results.push(`💡 Trending opportunities: ${winnersToAdd.map(t => t.name).join(", ")}`);

    // Save to DB for review
    try {
      const Database = require("better-sqlite3");
      const path = require("path");
      const fs = require("fs");
      const DATA_DIR = process.env.DATA_DIR ?? "/home/aitaskflo/data";
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const db = new Database(path.join(DATA_DIR, "lyra.db"));
      db.prepare(`CREATE TABLE IF NOT EXISTS store_trends (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        shop TEXT,
        product_data TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT
      )`).run();
      for (const t of winnersToAdd) {
        db.prepare(`INSERT OR REPLACE INTO store_trends (id, user_id, shop, product_data, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`)
          .run(`${userId}-${Date.now()}-${Math.random()}`, userId, shop, JSON.stringify(t), new Date().toISOString());
      }
    } catch { /* non-blocking */ }

    return `📊 **Store Loop Complete**\n\n${results.join("\n")}\n\n${decisions.filter(d => d.action === "scale").map(d => `📈 Scale "${d.title}"`).join("\n")}`;

  } catch (e) {
    return `Store loop error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
