"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface ConnectedAccount {
  platform: string;
  username?: string;
  page_name?: string;
  expires_at?: string;
}

function SocialContent() {
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState("");

  useEffect(() => {
    fetch("/api/social/status")
      .then(r => r.json())
      .then((d: { accounts: ConnectedAccount[] }) => { setAccounts(d.accounts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const platforms = [
    { id: "facebook", label: "Facebook", icon: "📘", desc: "Post to your Facebook Page" },
    { id: "instagram", label: "Instagram", icon: "📸", desc: "Post images to Instagram Business" },
    { id: "tiktok", label: "TikTok", icon: "🎵", desc: "Upload videos to TikTok" },
  ];

  function isConnected(id: string) {
    return accounts.some(a => a.platform === id);
  }

  function getAccount(id: string) {
    return accounts.find(a => a.platform === id);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e2e2f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <a href="/" style={{ color: "#6b6b8a", textDecoration: "none", fontSize: 14 }}>← Back to Lyra</a>

        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: "1.5rem", marginBottom: 8 }}>Social Accounts</h1>
        <p style={{ color: "#6b6b8a", marginBottom: "2rem" }}>
          Connect your accounts once. Lyra posts automatically when she launches a product or sees a trend.
        </p>

        {connected && (
          <div style={{ background: "#0d2d1a", border: "1px solid #1a5c34", borderRadius: 10, padding: "12px 16px", marginBottom: "1.5rem", color: "#4ade80" }}>
            {connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully.
          </div>
        )}
        {error && (
          <div style={{ background: "#2d0d0d", border: "1px solid #5c1a1a", borderRadius: 10, padding: "12px 16px", marginBottom: "1.5rem", color: "#f87171" }}>
            Error: {error}
          </div>
        )}
        {disconnectError && (
          <div style={{ background: "#2d0d0d", border: "1px solid #5c1a1a", borderRadius: 10, padding: "12px 16px", marginBottom: "1.5rem", color: "#f87171" }}>
            {disconnectError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {platforms.map(p => {
            const account = getAccount(p.id);
            const active = !!account;
            return (
              <div key={p.id} style={{ background: "#12121a", border: `1px solid ${active ? "#2a4a2a" : "#1e1e2e"}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 28 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.label}</div>
                  <div style={{ color: "#6b6b8a", fontSize: 13, marginTop: 2 }}>
                    {active
                      ? (account.page_name ?? account.username ?? "Connected")
                      : p.desc}
                  </div>
                </div>
                {loading ? (
                  <div style={{ color: "#6b6b8a", fontSize: 13 }}>...</div>
                ) : active ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#4ade80", fontSize: 13 }}>Connected</span>
                    <button
                      onClick={async () => {
                        setDisconnecting(p.id);
                        setDisconnectError("");
                        try {
                          const r = await fetch("/api/social/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: p.id }) });
                          if (!r.ok) throw new Error();
                          setAccounts(prev => prev.filter(a => a.platform !== p.id));
                        } catch {
                          setDisconnectError(`Failed to disconnect ${p.label}. Try again.`);
                        } finally {
                          setDisconnecting(null);
                        }
                      }}
                      disabled={disconnecting === p.id}
                      style={{ background: "none", border: "1px solid #3a1a1a", borderRadius: 6, color: "#f87171", padding: "4px 10px", cursor: "pointer", fontSize: 12, opacity: disconnecting === p.id ? 0.5 : 1 }}
                    >
                      {disconnecting === p.id ? "…" : "Disconnect"}
                    </button>
                  </div>
                ) : (
                  <a
                    href={`/api/social/connect?platform=${p.id}`}
                    style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", borderRadius: 8, padding: "8px 16px", textDecoration: "none", fontSize: 14, fontWeight: 500 }}
                  >
                    Connect
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Widget install instructions */}
        <div style={{ marginTop: "2.5rem", background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 12, padding: "20px 24px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Shopify Chat Widget</h2>
          <p style={{ color: "#6b6b8a", fontSize: 14, marginBottom: 16 }}>
            Add Lyra as a chat assistant to any Shopify store. Paste this into your theme's <code style={{ background: "#1a1a2e", padding: "2px 6px", borderRadius: 4 }}>theme.liquid</code> before the closing <code style={{ background: "#1a1a2e", padding: "2px 6px", borderRadius: 4 }}>&lt;/body&gt;</code> tag.
          </p>
          <div style={{ background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 8, padding: 16, position: "relative" }}>
            <pre style={{ margin: 0, fontSize: 13, color: "#a78bfa", overflowX: "auto", whiteSpace: "pre-wrap" }}>
              {`<script\n  src="https://aitaskflo.com/api/shopify/widget-js?shop={{ shop.permanent_domain }}"\n  defer\n></script>`}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(`<script\n  src="https://aitaskflo.com/api/shopify/widget-js?shop={{ shop.permanent_domain }}"\n  defer\n></script>`)}
              style={{ position: "absolute", top: 10, right: 10, background: "#1e1e2e", border: "1px solid #2a2a3a", borderRadius: 6, color: "#a78bfa", padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
            >
              Copy
            </button>
          </div>
          <p style={{ color: "#6b6b8a", fontSize: 12, marginTop: 12 }}>
            Shopify automatically fills in <code style={{ background: "#1a1a2e", padding: "2px 4px", borderRadius: 3 }}>{"{{ shop.permanent_domain }}"}</code> with your store's domain. The widget only activates for stores that have installed the Lyra app.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SocialPage() {
  return <Suspense fallback={null}><SocialContent /></Suspense>;
}
