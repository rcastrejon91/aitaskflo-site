"use client";

// Note: metadata for client components is set via layout — pricing has no server metadata file

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ArrowLeft, Zap } from "lucide-react";
import { PLANS } from "@/lib/plans";

const PLAN_KEYS = ["free", "pro", "business"] as const;

const GRADIENTS = {
  free:     "from-white/5 to-white/2",
  pro:      "from-violet-950/60 to-purple-950/40",
  business: "from-fuchsia-950/60 to-violet-950/40",
};

const BORDERS = {
  free:     "border-white/10",
  pro:      "border-violet-500/30",
  business: "border-fuchsia-500/30",
};

const ACCENTS = {
  free:     "text-white/50",
  pro:      "text-violet-300",
  business: "text-fuchsia-300",
};

const BUTTON_STYLES = {
  free:     "bg-white/8 text-white/60 hover:bg-white/12",
  pro:      "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40",
  business: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-900/40",
};

const PLAN_COPY = {
  free: {
    line: "Try Lyra with memory, search, weather, and image generation.",
    bestFor: "Best for testing the workspace",
  },
  pro: {
    line: "Run Lyra as your daily AI workspace with unlimited messages.",
    bestFor: "Best for individuals and builders",
  },
  business: {
    line: "Add team workflows, API access, analytics, and white-label options.",
    bestFor: "Best for teams and client work",
  },
};

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function upgrade(plan: "pro" | "business") {
    setLoading(plan);
    setCheckoutError(null);
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
        setCheckoutError(data.error ?? "Something went wrong — try again.");
      }
    } catch {
      setCheckoutError("Checkout failed — please try again.");
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
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 w-full">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)", color: "rgb(167,139,250)" }}>
            <Zap className="w-3 h-3" /> Simple pricing
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            Choose your plan
          </h1>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            Start with the free workspace. Upgrade when Lyra becomes part of your daily work.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          {["Cancel anytime", "Secure Stripe checkout", "Private account memory"].map((item) => (
            <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/45">
              {item}
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLAN_KEYS.map((key) => {
            const plan = PLANS[key];
            const isPro = key === "pro";
            return (
              <div key={key} className={`relative rounded-2xl border bg-gradient-to-br p-7 flex flex-col ${GRADIENTS[key]} ${BORDERS[key]}`}>
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                    style={{ background: "rgb(109,40,217)", color: "white" }}>
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h2 className={`text-sm font-semibold tracking-wide uppercase mb-3 ${ACCENTS[key]}`}>
                    {plan.name}
                  </h2>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    {plan.price > 0 && <span className="text-white/35 text-sm mb-1">/mo</span>}
                  </div>
                  <p className="text-xs text-white/30">
                    {plan.messagesPerDay === Infinity ? "Unlimited messages" : `${plan.messagesPerDay} messages/day`}
                  </p>
                  <p className="mt-4 text-sm text-white/50 leading-relaxed">
                    {PLAN_COPY[key].line}
                  </p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/25">
                    {PLAN_COPY[key].bestFor}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                      <Check className={`w-4 h-4 flex-shrink-0 ${ACCENTS[key]}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {key === "free" ? (
                  <button
                    onClick={() => router.push("/login")}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${BUTTON_STYLES[key]}`}
                  >
                    Start free
                  </button>
                ) : (
                  <button
                    onClick={() => upgrade(key)}
                    disabled={loading === key}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${BUTTON_STYLES[key]}`}
                  >
                    {loading === key ? "Redirecting…" : `Get ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {checkoutError && (
          <p className="text-center text-red-400 text-sm mt-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 max-w-md mx-auto">
            {checkoutError}
          </p>
        )}

        <p className="text-center text-white/25 text-xs mt-10">
          Cancel anytime · Secure payments via Stripe · No hidden fees
        </p>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "What counts as a message?",
                a: "Every time you send a message to Lyra and receive a response counts as one message. Free accounts get 40 per day, resetting at midnight UTC. Pro and Business are unlimited.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel from your account settings at any time. You keep access until the end of your billing period — no partial refunds, no surprises.",
              },
              {
                q: "What payment methods do you accept?",
                a: "All major credit and debit cards (Visa, Mastercard, Amex) via Stripe. Your payment info is never stored on our servers.",
              },
              {
                q: "Can I upgrade or downgrade later?",
                a: "Yes. You can switch plans at any time. Upgrades take effect immediately, downgrades at the next billing cycle.",
              },
              {
                q: "What happens when I hit my daily limit?",
                a: "On the Free plan, messages are paused until midnight UTC when the counter resets. You'll see a clear message letting you know — no surprise charges.",
              },
              {
                q: "What's the difference between Pro and Business?",
                a: "Business adds API access, multiple user seats, an analytics dashboard, white-label options, and priority support on top of everything in Pro.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h3 className="text-sm font-semibold text-white mb-2">{q}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
