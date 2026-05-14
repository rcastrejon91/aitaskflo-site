"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Starfield } from "@/components/lyra/Starfield";

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
  const [devAdminLoading, setDevAdminLoading] = useState(false);
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

  async function handleDevAdminSignIn() {
    setError("");
    setDevAdminLoading(true);

    try {
      const res = await fetch("/api/auth/dev-admin", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not create local admin");
        setDevAdminLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Local admin created, but sign-in failed");
        setDevAdminLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch {
      setError("Could not sign in as local admin");
      setDevAdminLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#080810" }}
    >
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Starfield className="absolute inset-0 w-full h-full opacity-60" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[130px]" style={{ background: "rgba(109,40,217,0.1)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[110px]" style={{ background: "rgba(134,25,143,0.07)" }} />
      </div>

      {/* Back */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm transition-colors" style={{ color: "rgba(255,255,255,0.28)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
      >
        <ArrowLeft className="w-4 h-4" /> Home
      </Link>

      {/* Two-column layout on lg+ */}
      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_400px] items-center gap-10 lg:gap-16">

        {/* Left — static pitch */}
        <div className="hidden lg:flex flex-col gap-8">
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
              One private workspace for chat, memory, automation, and the tools you already use.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-white/45">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3">
              Lyra remembers every conversation — no re-explaining, no starting over.
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3">
              Send emails, search the web, generate images, and run multi-step workflows.
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3">
              Free forever. No credit card required to get started.
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="w-full max-w-sm justify-self-center lg:justify-self-end">
          {/* Logo (mobile only) */}
          <div className="flex flex-col items-center mb-8 md:hidden">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}>
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Lyra</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>by AITaskFlo</p>
          </div>

          <div className="rounded-2xl p-6 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">
                {mode === "login" ? "Sign in to Lyra" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-white/35">
                {mode === "login" ? "Use your account to open the Lyra workspace." : "Start with a private Lyra account."}
              </p>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
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
                    <Link href="/forgot-password" className="text-[11px] text-white/30 hover:text-white/50 transition-colors">
                      Forgot password?
                    </Link>
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
                    aria-label={showPass ? "Hide password" : "Show password"}
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
                {mode === "login" ? "Continue to Lyra" : "Create account"}
              </button>

              {process.env.NODE_ENV !== "production" && (
                <button
                  type="button"
                  onClick={handleDevAdminSignIn}
                  disabled={devAdminLoading}
                  className="w-full py-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 hover:bg-emerald-400/15 disabled:opacity-40 text-emerald-200 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {devAdminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Sign in as local admin
                </button>
              )}

              <div className="border-t border-white/[0.08] pt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                  className="text-sm text-violet-200 hover:text-white transition-colors"
                >
                  {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
                </button>
                <p className="text-xs text-white/20 mt-3">
                  Your data is private, isolated to your account, and used to keep Lyra useful across sessions.
                </p>
              </div>
            </form>
          </div>
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
