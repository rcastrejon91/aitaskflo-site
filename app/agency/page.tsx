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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          className="flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-white/10 shadow-2xl sm:w-80"
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
            <button onClick={() => setOpen(false)} aria-label="Close agency chat" className="text-white/40 hover:text-white/70 transition-colors">
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
        aria-label={open ? "Close agency chat" : "Open agency chat"}
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
    icon: "CM",
    title: "Content & Marketing",
    desc: "Automate social posts, email campaigns, blog drafts, and ad copy. Your brand stays active without the manual overhead.",
  },
  {
    icon: "SO",
    title: "Sales & Outreach",
    desc: "AI-driven lead follow-up, CRM updates, proposal generation, and pipeline tracking — all running in the background.",
  },
  {
    icon: "OP",
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
    <div className="min-h-screen text-white flex flex-col bg-[#080810]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-70">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-violet-500/10 via-teal-400/5 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <header className="mb-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-black text-black">AI</span>
            <span className="text-sm font-semibold text-white">AI Task Flo</span>
          </a>
          <nav className="hidden items-center gap-5 text-sm text-white/50 sm:flex">
            <a href="#systems" className="transition-colors hover:text-white">Systems</a>
            <a href="#pricing" className="transition-colors hover:text-white">Plans</a>
            <a href="/demo" className="transition-colors hover:text-white">Demo</a>
          </nav>
          <a href="#pricing" className="rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-white/75 transition-colors hover:border-white/24 hover:text-white">
            Start
          </a>
        </header>

        {/* Hero */}
        <div className="mb-24 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-400/10 px-3 py-1.5 text-xs font-medium text-teal-200">
            <Zap className="w-3 h-3" /> AI-powered automation agency
          </div>
          <h1 className="mx-auto mb-6 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
            AI automation systems for service businesses
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            We build the workflows, agents, and integrations that handle follow-up, content, reporting, scheduling, and client support while your team stays focused on revenue.
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-black transition-all hover:bg-teal-100"
          >
            See plans
          </a>
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/35 p-2 text-center backdrop-blur">
            {["Marketing", "Sales", "Operations"].map((item) => (
              <div key={item} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div id="systems" className="mb-24 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-4 rounded-lg border border-white/8 bg-white/[0.035] p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-xs font-black text-teal-200">{f.icon}</span>
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
              Choose the level of build-out your business needs. Every plan includes setup, launch support, and ongoing optimization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AGENCY_PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-lg border bg-gradient-to-br p-7 ${plan.gradient} ${plan.border}`}
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
                  className={`w-full rounded-lg py-3 text-sm font-medium transition-all disabled:opacity-50 ${plan.button}`}
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
