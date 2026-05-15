"use client";

import { useEffect, useState } from "react";

interface Token { platform: string; username?: string; page_name?: string; page_id?: string; expires_at?: string; }

export default function FacebookPage() {
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/social/status")
      .then(r => r.json())
      .then((d: { accounts: Token[] }) => {
        setToken(d.accounts.find(a => a.platform === "facebook") ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const connected = !!token;

  function disconnect() {
    fetch("/api/social/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "facebook" }) })
      .then(() => { setToken(null); });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e2e2f0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <a href="/social" style={{ color: "#6b6b8a", textDecoration: "none", fontSize: 14 }}>← Social Accounts</a>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#1877f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📘</div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Facebook</h1>
            <p style={{ color: "#6b6b8a", margin: "4px 0 0", fontSize: 14 }}>Post to your Facebook Page automatically</p>
          </div>
        </div>

        {/* Status card */}
        <div style={{ background: "#12121a", border: `1px solid ${connected ? "#1a4a2a" : "#1e1e2e"}`, borderRadius: 12, padding: "20px 24px", marginBottom: "1.5rem" }}>
          {loading ? (
            <p style={{ color: "#6b6b8a", margin: 0 }}>Checking connection...</p>
          ) : connected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                  <span style={{ color: "#4ade80", fontWeight: 600 }}>Connected</span>
                </div>
                <div style={{ color: "#a0a0c0", fontSize: 14 }}>
                  {token?.page_name ? `Page: ${token.page_name}` : token?.username ?? "Facebook account"}
                </div>
                {token?.page_id && <div style={{ color: "#6b6b8a", fontSize: 12, marginTop: 2 }}>Page ID: {token.page_id}</div>}
              </div>
              <button onClick={disconnect} style={{ background: "none", border: "1px solid #5c1a1a", borderRadius: 8, color: "#f87171", padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: "#a0a0c0", fontSize: 14, marginTop: 0 }}>
                Not connected. Connect your Facebook account so Lyra can post to your Page when she launches a product or runs a promo.
              </p>
              <a
                href="/api/social/connect?platform=facebook"
                style={{ display: "inline-block", background: "#1877f2", color: "white", borderRadius: 8, padding: "10px 20px", textDecoration: "none", fontSize: 14, fontWeight: 600 }}
              >
                Connect Facebook
              </a>
            </div>
          )}
        </div>

        {/* What Lyra does */}
        <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 12, padding: "20px 24px", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>What Lyra does with Facebook</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["🛍️", "New product drop", "Posts automatically when she creates a new Shopify product"],
              ["📊", "Sales promos", "Creates posts when running a discount or flash sale"],
              ["📣", "Weekly content", "Shares lore, behind-the-scenes, or product highlights on your schedule"],
              ["💬", "Responds to comments", "Can monitor and reply to comments on your posts"],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{title}</div>
                  <div style={{ color: "#6b6b8a", fontSize: 13 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Setup requirements */}
        {!process.env.NEXT_PUBLIC_FACEBOOK_CONFIGURED && (
          <div style={{ background: "#1a1208", border: "1px solid #4a3a0a", borderRadius: 12, padding: "20px 24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, color: "#fbbf24" }}>Setup required</h2>
            <p style={{ color: "#a08040", fontSize: 13, marginBottom: 12 }}>
              To enable Facebook posting, add these to your <code style={{ background: "#0a0a0f", padding: "2px 5px", borderRadius: 3 }}>.env.local</code>:
            </p>
            <pre style={{ background: "#0a0a0f", border: "1px solid #2a2a0a", borderRadius: 8, padding: 14, fontSize: 13, color: "#e2c97e", margin: 0 }}>
{`FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret`}
            </pre>
            <p style={{ color: "#6b6b8a", fontSize: 12, marginTop: 12, marginBottom: 0 }}>
              Create an app at developers.facebook.com → Add "Facebook Login" product → Set redirect URI to:{" "}
              <code style={{ background: "#0a0a0f", padding: "2px 5px", borderRadius: 3 }}>https://aitaskflo.com/api/social/callback</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
