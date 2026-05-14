"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Sparkles, User, CreditCard, LogOut, ExternalLink, CheckCircle, AlertCircle, Crown, Monitor, Copy, Check, Heart, X, Plus } from "lucide-react";

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

  // ── Lyra preferences ──
  const [manualInterests, setManualInterests] = useState<string[]>([]);
  const [tonePref, setTonePref] = useState("");
  const [avoidTopics, setAvoidTopics] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);
  const [prefError, setPrefError] = useState("");
  const prefLoaded = useRef(false);

  useEffect(() => {
    if (prefLoaded.current) return;
    prefLoaded.current = true;
    fetch("/api/lyra/interests/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.manual_interests) setManualInterests(d.manual_interests);
        if (d.tone_preference) setTonePref(d.tone_preference);
        if (d.avoid_topics) setAvoidTopics(d.avoid_topics);
      })
      .catch(() => {});
  }, []);

  function addTag() {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9 \-]/g, "").slice(0, 40);
    if (!tag || manualInterests.includes(tag) || manualInterests.length >= 30) return;
    setManualInterests((prev) => [...prev, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setManualInterests((prev) => prev.filter((t) => t !== tag));
  }

  async function savePreferences() {
    setPrefSaving(true);
    setPrefError("");
    try {
      const res = await fetch("/api/lyra/interests/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual_interests: manualInterests, tone_preference: tonePref, avoid_topics: avoidTopics }),
      });
      if (!res.ok) throw new Error();
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2500);
    } catch {
      setPrefError("Couldn't save. Try again.");
    } finally {
      setPrefSaving(false);
    }
  }

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
              <p className="text-white/50 mb-2 leading-relaxed">Browser agent — lets Lyra control your browser, click around, fill forms, and work autonomously.</p>
              <span className="inline-flex items-center gap-1.5 text-violet-400/60 font-medium cursor-default select-none">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>Coming soon</span>
                Extension in development
              </span>
            </div>
          </div>
        </div>

        {/* Tell Lyra about you */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.25)" }}>
              <Heart className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Tell Lyra about you</h2>
              <p className="text-xs text-white/35">Optional — Lyra already learns from conversations</p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {/* Interests */}
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2">Interests</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {manualInterests.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(109,40,217,0.18)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(196,181,253)" }}
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-violet-300/50 hover:text-violet-200 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="e.g. music, startups, sci-fi…"
                  maxLength={40}
                  className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none transition-colors"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
                />
                <button
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
                  style={{ background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(196,181,253)" }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2">Preferred tone</label>
              <input
                value={tonePref}
                onChange={(e) => setTonePref(e.target.value)}
                placeholder="e.g. casual and direct, no corporate speak…"
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none transition-colors"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
              />
            </div>

            {/* Avoid */}
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2">Things to avoid</label>
              <input
                value={avoidTopics}
                onChange={(e) => setAvoidTopics(e.target.value)}
                placeholder="e.g. motivational quotes, long bullet lists…"
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none transition-colors"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={savePreferences}
                disabled={prefSaving}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.35)", color: "rgb(196,181,253)" }}
              >
                {prefSaving ? "Saving…" : "Save"}
              </button>
              {prefSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              {prefError && <span className="text-xs text-red-400">{prefError}</span>}
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
