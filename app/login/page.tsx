"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Loader2, Eye, EyeOff, ArrowLeft, FlaskConical } from "lucide-react";
import Link from "next/link";

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
  const [destination, setDestination] = useState(callbackUrl);

  const DESTINATIONS = [
    { label: "Lyra", path: "/lyra" },
    { label: "Play", path: "/play" },
  ];

  async function quickLogin(dest: string) {
    if (!email || !password) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) { setError("Invalid credentials"); setLoading(false); return; }
      router.push(dest);
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

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

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(mode === "login" ? "Invalid username/email or password" : "Account created but sign-in failed — try logging in");
        setLoading(false);
        return;
      }

      router.push(destination);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden" style={{ background: "#080810" }}>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[130px]" style={{ background: "rgba(109,40,217,0.1)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[110px]" style={{ background: "rgba(134,25,143,0.07)" }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)",
          backgroundSize: "44px 44px"
        }} />
      </div>

      {/* Back to home */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm transition-colors" style={{ color: "rgba(255,255,255,0.28)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}>
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Lyra</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>by AITaskFlo</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Tabs */}
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
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Min. 8 characters" : "Your password"}
                  required
                  className="w-full bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {mode === "login" && (
              <div className="space-y-2">
                <p className="text-[11px] text-white/30 text-center">Go to</p>
                <div className="grid grid-cols-2 gap-2">
                  {DESTINATIONS.map((d) => (
                    <button
                      key={d.path}
                      type="button"
                      onClick={() => quickLogin(d.path)}
                      disabled={loading || !email || !password}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-30 border ${
                        destination === d.path
                          ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                          : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20"
                      }`}
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : `→ ${d.label}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-40 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in → Lyra" : "Create account"}
            </button>
          </form>
        </div>

        {/* Try demo CTA */}
        <div className="mt-5 rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <div>
            <p className="text-xs font-medium text-white/60">Not ready to sign up?</p>
            <p className="text-[11px] text-white/30 mt-0.5">Try Lyra free — no account needed</p>
          </div>
          <Link
            href="/demo"
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(20,184,166,0.3))", border: "1px solid rgba(139,92,246,0.3)", color: "rgba(196,181,253,1)" }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Try Demo
          </Link>
        </div>

        <p className="text-center text-xs text-white/20 mt-4">
          Your data is private and isolated to your account.
        </p>
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
