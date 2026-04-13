"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/lyra/AppShell";

interface Product {
  id: string;
  gumroad_id?: string;
  name: string;
  price: number;
  status: string;
  file_url?: string;
  cover_url?: string;
  short_url?: string;
  sales: number;
  revenue: number;
  created_at: string;
}

interface EarningsData {
  products: Product[];
  totalRevenue: number;
  totalSales: number;
  gumroadConnected: boolean;
}

export default function ShopPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/shop");
      if (res.ok) setData(await res.json() as EarningsData);
    } finally {
      setLoading(false);
    }
  }

  async function syncGumroad() {
    setRefreshing(true);
    try {
      await fetch("/api/lyra/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) });
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }

  const totalDollars = data ? (data.totalRevenue / 100).toFixed(2) : "0.00";

  return (
    <AppShell>
      <div className="min-h-screen bg-black text-white font-mono">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Lyra Shop</h1>
              <p className="text-white/40 text-sm mt-1">Products Lyra has built and listed for sale</p>
            </div>
            <div className="flex items-center gap-3">
              {data && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${data.gumroadConnected ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-red-500/40 text-red-400 bg-red-500/10"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${data.gumroadConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                  {data.gumroadConnected ? "Gumroad Connected" : "Gumroad Not Connected"}
                </div>
              )}
              <button
                onClick={syncGumroad}
                disabled={refreshing}
                className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors disabled:opacity-30"
              >
                {refreshing ? "Syncing…" : "Sync Sales"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-white/20 text-sm text-center py-16">Loading…</div>
          ) : (
            <>
              {/* Revenue cards */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="text-3xl font-bold text-emerald-400">${totalDollars}</div>
                  <div className="text-xs text-white/40 mt-1">Total Revenue</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="text-3xl font-bold text-white">{data?.totalSales ?? 0}</div>
                  <div className="text-xs text-white/40 mt-1">Total Sales</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="text-3xl font-bold text-white">{data?.products.length ?? 0}</div>
                  <div className="text-xs text-white/40 mt-1">Products Live</div>
                </div>
              </div>

              {/* Setup instructions if not connected */}
              {data && !data.gumroadConnected && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mb-6">
                  <p className="text-amber-400 text-sm font-semibold mb-1">Connect Gumroad to start selling</p>
                  <p className="text-white/40 text-xs mb-4">
                    Authorize Lyra to create and manage your Gumroad products automatically.
                  </p>
                  <GumroadConnectButton />
                  <p className="text-white/20 text-xs mt-3">
                    Requires <code className="font-mono">GUMROAD_CLIENT_ID</code> + <code className="font-mono">GUMROAD_CLIENT_SECRET</code> in .env.local
                  </p>
                </div>
              )}

              {/* Products */}
              {(!data?.products || data.products.length === 0) ? (
                <div className="text-center py-16">
                  <div className="text-white/20 text-4xl mb-4">🛒</div>
                  <div className="text-white/20 text-sm">No products yet</div>
                  <div className="text-white/10 text-xs mt-2">Tell Lyra to build the Frost Empress Grimoire bundle to get started</div>
                  <div className="mt-4 px-4 py-2 rounded-lg bg-white/5 inline-block text-xs text-white/30 font-mono">
                    &quot;Build the Frost Empress Grimoire and list it on Gumroad for $24&quot;
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Products</p>
                  {data.products.map(product => (
                    <ProductRow key={product.id} product={product} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function GumroadConnectButton() {
  function connect() {
    const clientId = process.env.NEXT_PUBLIC_GUMROAD_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/gumroad/callback`;
    const url = `https://gumroad.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=edit_products`;
    window.location.href = url;
  }

  return (
    <button
      onClick={connect}
      className="px-4 py-2 rounded-lg bg-[#ff90e8]/20 text-[#ff90e8] border border-[#ff90e8]/30 hover:bg-[#ff90e8]/30 transition-colors text-sm font-medium"
    >
      Connect Gumroad →
    </button>
  );
}

function ProductRow({ product }: { product: Product }) {
  const isLive = product.status === "live";
  const revenue = (product.revenue / 100).toFixed(2);
  const price = (product.price / 100).toFixed(2);

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${isLive ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{product.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${isLive ? "border-emerald-500/30 text-emerald-400/70" : "border-white/10 text-white/30"}`}>
            {product.status}
          </span>
        </div>
        <p className="text-xs text-white/30 mt-0.5">
          ${price} · Created {new Date(product.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-xs shrink-0">
        <div className="text-center">
          <div className="text-white font-semibold">{product.sales}</div>
          <div className="text-white/30">sales</div>
        </div>
        <div className="text-center">
          <div className="text-emerald-400 font-semibold">${revenue}</div>
          <div className="text-white/30">earned</div>
        </div>
        {product.short_url && (
          <a
            href={product.short_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors"
          >
            View →
          </a>
        )}
      </div>
    </div>
  );
}
