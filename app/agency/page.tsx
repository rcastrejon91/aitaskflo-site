"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Zap, MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";

// ── Inline agency chat widget ─────────────────────────────────────────────────
interface AgencyMessage {
  role: "user" | "assistant";
  content: string;
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function AgencyChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AgencyMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(generateId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          conversationId,
          persona: "client",
          referrer: "/agency",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-80 rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-2xl"
          style={{ background: "#0d0d1a", height: "420px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"
            style={{ background: "rgba(109,40,217,0.2)" }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-white">Lyra — Agency</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-white/30 text-xs text-center mt-6">
                Ask me about automation for your business.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`rounded-xl px-3 py-2 text-xs max-w-[85%] leading-relaxed ${
                  m.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 border border-white/8 text-white/80"
                }`}>
                  {m.content === "" && loading && i === messages.length - 1 ? (
                    <span className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  ) : m.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500/50"
                placeholder="What can we automate for you?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                {loading ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Send className="w-3 h-3 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
}

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "✦",
    title: "Content & Marketing",
    desc: "Automate social posts, email campaigns, blog drafts, and ad copy. Your brand stays active without the manual overhead.",
  },
  {
    icon: "◈",
    title: "Sales & Outreach",
    desc: "AI-driven lead follow-up, CRM updates, proposal generation, and pipeline tracking — all running in the background.",
  },
  {
    icon: "⬡",
    title: "Operations & Admin",
    desc: "Invoicing, scheduling, reporting, onboarding flows. The back-office work that drains hours, handled automatically.",
  },
];

// ── Pricing ───────────────────────────────────────────────────────────────────
const AGENCY_PLANS = [
  {
    key: "agency_starter",
    name: "Starter",
    price: 497,
    highlight: false,
    accent: "text-violet-300",
    border: "border-violet-500/30",
    gradient: "from-violet-950/60 to-purple-950/40",
    button: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40",
    features: ["Up to 5 automations", "Email + calendar automation", "Weekly reporting", "Lyra AI assistant", "Onboarding call"],
  },
  {
    key: "agency_growth",
    name: "Growth",
    price: 997,
    highlight: true,
    accent: "text-fuchsia-300",
    border: "border-fuchsia-500/40",
    gradient: "from-fuchsia-950/60 to-violet-950/40",
    button: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-900/40",
    features: ["Up to 15 automations", "CRM + pipeline automation", "Custom integrations (2)", "Dedicated Lyra instance", "Bi-weekly strategy calls", "Slack access"],
  },
  {
    key: "agency_full",
    name: "Agency",
    price: 2497,
    highlight: false,
    accent: "text-purple-300",
    border: "border-purple-500/30",
    gradient: "from-purple-950/60 to-fuchsia-950/40",
    button: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40",
    features: ["Unlimited automations", "Full business OS build-out", "Custom AI agents", "White-label option", "Weekly strategy sessions", "Priority build queue", "SLA guarantee"],
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgencyPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Something went wrong");
      }
    } catch {
      alert("Checkout failed — try again");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#080810" }}>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgb(109,40,217) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgb(134,25,143) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgb(79,70,229) 0%, transparent 70%)", filter: "blur(100px)" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 w-full">

        {/* Hero */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(167,139,250)" }}>
            <Zap className="w-3 h-3" /> AI-powered automation agency
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight leading-[1.1]">
            Your entire business.<br />
            <span style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(217,70,239))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Automated.
            </span>
          </h1>
          <p className="text-white/45 text-lg max-w-xl mx-auto mb-10">
            We build custom AI automation systems that handle your marketing, sales, and operations — so you can focus on growth.
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}
          >
            See plans <span className="text-white/70">→</span>
          </a>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/8 p-7 flex flex-col gap-4"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-2xl text-violet-400">{f.icon}</span>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div id="pricing" className="mb-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">Simple, outcome-based pricing</h2>
            <p className="text-white/40 text-base max-w-md mx-auto">
              No retainers. No guesswork. Choose the level of automation your business needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AGENCY_PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-2xl border bg-gradient-to-br p-7 flex flex-col ${plan.gradient} ${plan.border}`}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                    style={{ background: "rgb(134,25,143)", color: "white" }}
                  >
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 ${plan.accent}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${plan.price.toLocaleString()}</span>
                    <span className="text-white/35 text-sm mb-1">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm text-white/70">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.accent}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => checkout(plan.key)}
                  disabled={loading === plan.key}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${plan.button}`}
                >
                  {loading === plan.key ? "Redirecting…" : `Get ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/25 text-xs mt-8">
          Cancel anytime · Secure payments via Stripe · Results guaranteed or we work until they are
        </p>
      </div>

      {/* Floating chat widget */}
      <AgencyChat />
    </div>
  );
}
