"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Lock } from "lucide-react";

// ── Inline investor chat widget ───────────────────────────────────────────────
interface InvestorMessage {
  role: "user" | "assistant";
  content: string;
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function InvestorChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<InvestorMessage[]>([]);
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
          persona: "investor",
          referrer: "/investors",
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
              <span className="text-sm font-medium text-white">Lyra — Investor Deck</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-white/30 text-xs text-center mt-6">
                Ask anything about the company, the technology, or the opportunity.
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
                placeholder="Ask about traction, technology, vision…"
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

// ── Value props ───────────────────────────────────────────────────────────────
const VALUE_PROPS = [
  {
    label: "Self-Learning Engine",
    desc: "Lyra doesn't just respond — she reflects, evolves, and rewrites her own behavioral patterns based on every interaction. Each conversation makes the system smarter for the next.",
  },
  {
    label: "Living World Model",
    desc: "Persistent memory, real-time web awareness, and an evolving understanding of each user's context. Not a chatbot — a living AI layer embedded in your business.",
  },
  {
    label: "Agency Revenue Engine",
    desc: "The agency is the go-to-market wedge. Recurring subscription contracts at $497–$2,497/month fund the platform while generating proprietary training data at scale.",
  },
];

// ── Traction stats ────────────────────────────────────────────────────────────
const STATS = [
  { value: "500+", label: "Users" },
  { value: "10k+", label: "Conversations" },
  { value: "99.9%", label: "Uptime" },
  { value: "3 mo", label: "$0 to live" },
];

// ── Passphrase gate ───────────────────────────────────────────────────────────
const ACCESS_KEY = "inv_access";
const PASSPHRASE = process.env.NEXT_PUBLIC_INVESTOR_PASS ?? "lyra2025";

function PassphraseGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function attempt() {
    if (value.trim() === PASSPHRASE) {
      try { localStorage.setItem(ACCESS_KEY, "1"); } catch { /* ssr */ }
      onUnlock();
    } else {
      setError(true);
      setValue("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-white" style={{ background: "#080810" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgb(109,40,217) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgb(134,25,143) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full px-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-center">Investor Access</h1>
        <p className="text-white/40 text-sm text-center">This page is private. Enter the access passphrase to continue.</p>
        <input
          type="password"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50 text-center tracking-widest"
          placeholder="Passphrase"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && attempt()}
          autoFocus
        />
        {error && <p className="text-red-400/80 text-xs">Incorrect passphrase.</p>}
        <button
          onClick={attempt}
          className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InvestorsPage() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACCESS_KEY);
      setUnlocked(stored === "1");
    } catch {
      setUnlocked(false);
    }
  }, []);

  if (unlocked === null) return null; // hydration guard

  if (!unlocked) {
    return <PassphraseGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#080810" }}>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgb(109,40,217) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgb(134,25,143) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute top-[50%] left-[60%] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgb(79,70,229) 0%, transparent 70%)", filter: "blur(100px)" }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 w-full">

        {/* Hero */}
        <div className="mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(167,139,250)" }}>
            Private — Investor Overview
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight leading-[1.1] max-w-2xl">
            We&apos;re building the infrastructure for{" "}
            <span style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(217,70,239))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              intelligent business.
            </span>
          </h1>
          <p className="text-white/45 text-lg max-w-2xl leading-relaxed">
            aitaskflo is an AI operating system for small and mid-size businesses. Lyra — our core AI — self-improves, holds living memory, and deploys custom automation agents across any business function.
          </p>
        </div>

        {/* Value props */}
        <div className="mb-24 space-y-6">
          {VALUE_PROPS.map((vp, i) => (
            <div
              key={vp.label}
              className="rounded-2xl border border-white/8 p-8 flex gap-8 items-start"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <span className="text-3xl font-bold text-white/10 w-8 flex-shrink-0 mt-0.5 select-none">
                0{i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-white mb-2">{vp.label}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{vp.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Traction stats */}
        <div className="mb-24">
          <h2 className="text-xl font-bold mb-8 text-white/80 tracking-tight">Traction</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/8 p-6 text-center"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs text-white/35 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div
          className="rounded-2xl border border-violet-500/20 p-10 text-center"
          style={{ background: "rgba(109,40,217,0.06)" }}
        >
          <h2 className="text-2xl font-bold mb-3 tracking-tight">Ready to talk?</h2>
          <p className="text-white/40 text-sm mb-6 max-w-sm mx-auto">
            We&apos;re raising a seed round. If you see what we see, let&apos;s connect.
          </p>
          <a
            href="mailto:invest@aitaskflo.com"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}
          >
            invest@aitaskflo.com
          </a>
        </div>
      </div>

      {/* Floating chat widget */}
      <InvestorChat />
    </div>
  );
}
