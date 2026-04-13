import { NextRequest, NextResponse } from "next/server";
import { listCommerceProducts, updateProductStats } from "@/lib/lyra/db";

export async function GET() {
  try {
    const products = listCommerceProducts();
    const totalRevenue = products.reduce((sum, p) => sum + (p.revenue ?? 0), 0);
    const totalSales = products.reduce((sum, p) => sum + (p.sales ?? 0), 0);

    // Check if Gumroad is configured
    const gumroadConnected = !!process.env.GUMROAD_ACCESS_TOKEN;

    return NextResponse.json({ products, totalRevenue, totalSales, gumroadConnected });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json() as { action: string };

    if (action === "sync") {
      // Sync sales data from Gumroad
      if (!process.env.GUMROAD_ACCESS_TOKEN) {
        return NextResponse.json({ error: "Gumroad not connected" }, { status: 400 });
      }

      const { listProducts } = await import("@/lib/lyra/gumroad");
      const gumroadProducts = await listProducts();
      const dbProducts = listCommerceProducts();

      // Update stats for products we have in DB
      for (const gp of gumroadProducts) {
        const dbMatch = dbProducts.find(d => d.gumroad_id === gp.id);
        if (dbMatch) {
          updateProductStats(gp.id, gp.sales_count, gp.revenue);
        }
      }

      return NextResponse.json({ ok: true, synced: gumroadProducts.length });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
