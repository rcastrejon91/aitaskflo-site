"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ── Mini demo window (reused from landing page) ───────────────────────────────

const DEMO_MESSAGES = [
  { role: "user",  text: "Build me a space shooter game" },
  { role: "lyra",  text: "Generating Godot 4 scene — player ship, enemies, bullets, boss fight + mobile controls." },
  { role: "system", text: "⚡ game_build · SpaceShooter.gd · 340 lines" },
  { role: "user",  text: "Buy 5 NVDA shares if it dips below $900" },
  { role: "lyra",  text: "Price: $887.40. Executing market buy via Alpaca — 5 shares at $887.40. Filled." },
  { role: "system", text: "✅ trade_execute · NVDA ×5 · $4,437 filled" },
  { role: "user",  text: "Summarize Gmail & draft reply to investor thread" },
  { role: "lyra",  text: "3 unread investor emails. Drafting reply to Marcus at Gradient Ventures — referencing your $350K GCP credit." },
];

function DemoWindow() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= DEMO_MESSAGES.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), visible === 0 ? 600 : 1800);
    return () => clearTimeout(t);
  }, [visible]);

  // restart after fully shown
  useEffect(() => {
    if (visible < DEMO_MESSAGES.length) return;
    const t = setTimeout(() => setVisible(0), 3000);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0d0d1a" }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-2 h-2 rounded-full bg-red-500/60" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
        <div className="w-2 h-2 rounded-full bg-green-500/60" />
        <div className="ml-2 flex-1 rounded px-2 py-0.5 text-[11px]" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }}>
          aitaskflo.com/lyra
        </div>
      </div>
      {/* Chat messages */}
      <div className="p-4 space-y-2.5 min-h-[280px]">
        <AnimatePresence>
          {DEMO_MESSAGES.slice(0, visible).map((msg, i) => (
            <motion.div key={`${i}-${visible}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {msg.role === "user" && (
                <div className="flex justify-end">
                  <div className="px-3 py-1.5 rounded-2xl rounded-tr-sm text-xs max-w-[75%]" style={{ background: "rgba(109,40,217,0.35)", color: "rgba(255,255,255,0.9)" }}>
                    {msg.text}
                  </div>
                </div>
              )}
              {msg.role === "lyra" && (
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}>
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="px-3 py-1.5 rounded-2xl rounded-tl-sm text-xs max-w-[80%]" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)" }}>
                    {msg.text}
                  </div>
                </div>
              )}
              {msg.role === "system" && (
                <div className="flex justify-center">
                  <div className="px-2.5 py-1 rounded-full text-[10px] font-mono" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "rgb(110,231,183)" }}>
                    {msg.text}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {visible < DEMO_MESSAGES.length && (
          <div className="flex items-center gap-1.5 pl-7">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/lyra";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Registration failed"); setLoading(false); return; }
      }

      const result = await signIn("credentials", { email, password, redirect: false });

      if (result?.error) {
        setError(mode === "login" ? "Invalid username/email or password" : "Account created but sign-in failed — try logging in");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#080810" }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[130px]" style={{ background: "rgba(109,40,217,0.1)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[110px]" style={{ background: "rgba(134,25,143,0.07)" }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)",
          backgroundSize: "44px 44px",
        }} />
      </div>

      {/* Back */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm transition-colors" style={{ color: "rgba(255,255,255,0.28)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
      >
        <ArrowLeft className="w-4 h-4" /> Home
      </Link>

      {/* Two-column layout on md+ */}
      <div className="relative w-full max-w-4xl flex flex-col md:flex-row items-center gap-10 md:gap-16">

        {/* Left — demo */}
        <div className="hidden md:flex flex-col flex-1 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/70">Lyra — your AI agent</span>
            </div>
            <h2 className="text-2xl font-bold text-white leading-snug">
              Builds games,<br />trades stocks,<br />handles your inbox.
            </h2>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              One AI that does it all — no plugins needed.
            </p>
          </div>
          <DemoWindow />
          <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            <span>🔒 End-to-end encrypted</span>
            <span>·</span>
            <span>⚡ Streaming responses</span>
            <span>·</span>
            <span>🧠 Memory-aware</span>
          </div>
        </div>

        {/* Right — form */}
        <div className="w-full max-w-sm flex-shrink-0">
          {/* Logo (mobile only) */}
          <div className="flex flex-col items-center mb-8 md:hidden">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}>
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Lyra</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>by AITaskFlo</p>
          </div>

          <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Mode tabs */}
            <div className="flex rounded-xl bg-white/[0.04] p-1 mb-6">
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setMode(tab); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === tab
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {tab === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Name (optional)</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-white/50 mb-1.5">
                  {mode === "login" ? "Email or username" : "Email"}
                </label>
                <input
                  type="text" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === "login" ? "you@example.com or username" : "you@example.com"}
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-white/50">Password</label>
                  {mode === "login" && (
                    <span className="text-[11px] text-white/30 hover:text-white/50 cursor-pointer transition-colors"
                      onClick={() => setError("To reset your password, email aitaskflo@gmail.com")}>
                      Forgot password?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "Min. 8 characters" : "Your password"}
                    required
                    className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-40 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {mode === "login" ? "Sign in → Lyra" : "Create account"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-white/20 mt-4">
            Your data is private and isolated to your account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080810" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgb(167,139,250)" }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
