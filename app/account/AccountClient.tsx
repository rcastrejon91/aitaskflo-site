"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Sparkles, User, CreditCard, LogOut, ExternalLink, CheckCircle, AlertCircle, Crown, Monitor, Copy, Check } from "lucide-react";

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
  subscription: { plan: string; status: string; current_period_end?: string | null };
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400",
  past_due: "text-yellow-400",
  canceled: "text-red-400",
  trialing: "text-violet-400",
};

export default function AccountClient({ user, subscription, userId }: Props & { userId?: string }) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const agentKey = process.env.NEXT_PUBLIC_AGENT_KEY_HINT ?? "Get key from admin";

  async function openPortal() {
    setPortalLoading(true);
    setPortalError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error ?? "Could not open billing portal.");
      }
    } catch {
      setPortalError("Something went wrong. Try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  const isPaid = subscription.plan !== "free";
  const statusLabel = subscription.status
    ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1).replace("_", " ")
    : "—";

  return (
    <div className="min-h-screen text-white" style={{ background: "#080810" }}>
      {/* Blob bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[130px]" style={{ background: "rgba(109,40,217,0.06)" }} />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl" style={{ background: "rgba(8,8,16,0.85)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">AITaskFlo</span>
          </Link>
          <Link href="/lyra" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            Back to Lyra
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-24 relative">
        <Link href="/lyra" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Lyra
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>

        {/* Profile */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.25)" }}>
              <User className="w-4 h-4 text-violet-300" />
            </div>
            <h2 className="text-sm font-semibold text-white">Profile</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/40">Name</span>
              <span className="text-sm text-white/80">{user.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/40">Email</span>
              <span className="text-sm text-white/80">{user.email ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.25)" }}>
              <CreditCard className="w-4 h-4 text-violet-300" />
            </div>
            <h2 className="text-sm font-semibold text-white">Subscription</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/40">Plan</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                {isPaid && <Crown className="w-3.5 h-3.5 text-violet-300" />}
                {PLAN_LABELS[subscription.plan] ?? subscription.plan}
              </span>
            </div>
            {subscription.status && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Status</span>
                <span className={`text-sm flex items-center gap-1.5 font-medium ${STATUS_COLOR[subscription.status] ?? "text-white/60"}`}>
                  {subscription.status === "active" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {statusLabel}
                </span>
              </div>
            )}
            {subscription.current_period_end && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Renews</span>
                <span className="text-sm text-white/60">
                  {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {isPaid ? (
              <div className="space-y-2">
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(196,181,253)" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  {portalLoading ? "Opening…" : "Manage billing & invoices"}
                </button>
                {portalError && <p className="text-red-400 text-xs text-center">{portalError}</p>}
              </div>
            ) : (
              <Link href="/pricing" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all text-white" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 4px 16px rgba(109,40,217,0.25)" }}>
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Lyra Desktop Agent */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.25)" }}>
              <Monitor className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Lyra Desktop Agent</h2>
              <p className="text-xs text-white/35">Let Lyra control your browser</p>
            </div>
          </div>

          <div className="space-y-3">
            {userId && (
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1.5">Your User ID</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <code className="text-xs text-violet-300 flex-1 truncate">{userId}</code>
                  <button onClick={() => copyText(userId, "uid")} className="text-white/30 hover:text-white/60 transition-colors">
                    {copied === "uid" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <p className="text-white/50 mb-2 leading-relaxed">Install the Chrome Extension to let Lyra control your browser, click around, fill forms, and work autonomously.</p>
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-violet-300 hover:text-violet-200 transition-colors font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                Install Lyra Extension
              </a>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-8">
          Questions? <a href="mailto:aitaskflo@gmail.com" className="hover:text-white/40 transition-colors">aitaskflo@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
