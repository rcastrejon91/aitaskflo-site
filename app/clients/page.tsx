"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Status = "prospect" | "contacted" | "demo_sent" | "closed_won" | "closed_lost";
type Vertical = "content_creator" | "small_business" | "ecom" | "other";

interface Client {
  id: number;
  name: string;
  business: string | null;
  vertical: Vertical;
  status: Status;
  email: string | null;
  phone: string | null;
  notes: string | null;
  demo_url: string | null;
  follow_up: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS: { key: Status; label: string; color: string; bg: string }[] = [
  { key: "prospect",    label: "Prospect",   color: "rgba(255,255,255,0.3)",  bg: "rgba(255,255,255,0.03)" },
  { key: "contacted",   label: "Contacted",  color: "rgba(251,191,36,0.8)",   bg: "rgba(251,191,36,0.06)"  },
  { key: "demo_sent",   label: "Demo Sent",  color: "rgba(94,234,212,0.8)",   bg: "rgba(94,234,212,0.06)"  },
  { key: "closed_won",  label: "Closed Won", color: "rgba(74,222,128,0.9)",   bg: "rgba(74,222,128,0.07)"  },
  { key: "closed_lost", label: "Lost",       color: "rgba(248,113,113,0.7)",  bg: "rgba(248,113,113,0.05)" },
];

const VERTICAL_LABELS: Record<Vertical, string> = {
  content_creator: "Content Creator",
  small_business:  "Small Business",
  ecom:            "E-commerce",
  other:           "Other",
};

const VERTICAL_COLORS: Record<Vertical, string> = {
  content_creator: "rgba(167,139,250,0.7)",
  small_business:  "rgba(251,191,36,0.7)",
  ecom:            "rgba(94,234,212,0.7)",
  other:           "rgba(255,255,255,0.3)",
};

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Client) => void }) {
  const [form, setForm] = useState({ name: "", business: "", vertical: "other" as Vertical, email: "", phone: "", notes: "", follow_up: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: "prospect" }),
    });
    const data = await res.json();
    if (data.client) onAdd(data.client);
    onClose();
  }

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{label}</label>
      <input
        type={type} value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none" }}
      />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Add Prospect</h3>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {field("Name *", "name", "text", "e.g. Sarah's Bakery")}
          {field("Business type", "business", "text", "e.g. local bakery, Shopify brand")}
          <div>
            <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Vertical</label>
            <select value={form.vertical} onChange={e => setForm(f => ({ ...f, vertical: e.target.value as Vertical }))}
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none" }}>
              <option value="content_creator">Content Creator</option>
              <option value="small_business">Small Business</option>
              <option value="ecom">E-commerce</option>
              <option value="other">Other</option>
            </select>
          </div>
          {field("Email", "email", "email", "contact@example.com")}
          {field("Phone", "phone", "text", "+1 555...")}
          {field("Follow-up date", "follow_up", "date")}
          <div>
            <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="First impression, referral source, etc."
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button type="submit" disabled={!form.name || loading}
              style={{ flex: 1, padding: "10px", borderRadius: 9, background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, opacity: !form.name ? 0.5 : 1 }}>
              {loading ? "Saving…" : "Add Prospect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientCard({ client, onMove, onDelete }: {
  client: Client;
  onMove: (id: number, status: Status) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nextStatuses = COLUMNS.map(c => c.key).filter(s => s !== client.status);

  return (
    <div style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}
      onClick={() => setExpanded(e => !e)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#fff", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{client.name}</div>
          {client.business && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{client.business}</div>}
          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: VERTICAL_COLORS[client.vertical] }}>
            {VERTICAL_LABELS[client.vertical]}
          </span>
        </div>
        {client.follow_up && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginTop: 2 }}>
            {new Date(client.follow_up).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {client.email && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>✉ {client.email}</div>}
          {client.phone && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>📞 {client.phone}</div>}
          {client.notes && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{client.notes}</div>}
          {client.demo_url && (
            <a href={client.demo_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: "rgba(94,234,212,0.8)", textDecoration: "none" }}>🎬 View demo</a>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {nextStatuses.slice(0, 3).map(s => {
              const col = COLUMNS.find(c => c.key === s)!;
              return (
                <button key={s} onClick={e => { e.stopPropagation(); onMove(client.id, s); }}
                  style={{ fontSize: 10, padding: "4px 10px", borderRadius: 100, background: col.bg, border: `1px solid ${col.color}33`, color: col.color, cursor: "pointer" }}>
                  → {col.label}
                </button>
              );
            })}
            <a href={`/lyra?q=${encodeURIComponent(`Create a client demo for ${client.name}, they are a ${client.business ?? client.vertical}`)}`}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 10, padding: "4px 10px", borderRadius: 100, background: "rgba(109,40,217,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "rgba(167,139,250,0.9)", cursor: "pointer", textDecoration: "none" }}>
              ✦ Generate demo
            </a>
            <button onClick={e => { e.stopPropagation(); onDelete(client.id); }}
              style={{ fontSize: 10, padding: "4px 10px", borderRadius: 100, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "rgba(248,113,113,0.7)", cursor: "pointer" }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(d => { setClients(d.clients ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function move(id: number, status: Status) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    const updated = { ...client, status };
    setClients(cs => cs.map(c => c.id === id ? updated : c));
    await fetch(`/api/clients/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
  }

  async function remove(id: number) {
    setClients(cs => cs.filter(c => c.id !== id));
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
  }

  const totalValue = clients.filter(c => c.status === "closed_won").length * 49;

  return (
    <div style={{ minHeight: "100vh", background: "#08080f", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", height: 56, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,8,15,0.85)", backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/lyra" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Lyra</Link>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Client Pipeline</span>
          <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 100, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>{clients.length} total</span>
          {totalValue > 0 && <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 100, background: "rgba(74,222,128,0.08)", color: "rgba(74,222,128,0.8)", border: "1px solid rgba(74,222,128,0.2)" }}>${totalValue}/mo closed</span>}
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", border: "none", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: "0 0 20px rgba(109,40,217,0.3)" }}>
          + Add Prospect
        </button>
      </div>

      <div style={{ paddingTop: 56, padding: "56px 1.5rem 2rem", overflowX: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "4rem", color: "rgba(255,255,255,0.3)" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", gap: 16, paddingTop: "1.5rem", minWidth: "max-content" }}>
            {COLUMNS.map(col => {
              const colClients = clients.filter(c => c.status === col.key);
              return (
                <div key={col.key} style={{ width: 240, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label}</span>
                    <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 100, background: col.bg, color: col.color }}>{colClients.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 80, padding: "8px", borderRadius: 12, background: col.bg, border: `1px solid ${col.color}22` }}>
                    {colClients.length === 0 && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", textAlign: "center", paddingTop: 16 }}>Empty</div>
                    )}
                    {colClients.map(c => <ClientCard key={c.id} client={c} onMove={move} onDelete={remove} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={c => setClients(cs => [c, ...cs])} />}
    </div>
  );
}
