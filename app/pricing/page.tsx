"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ArrowLeft, Zap } from "lucide-react";
import { PLANS } from "@/lib/stripe";

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

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function upgrade(plan: "pro" | "business") {
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
          <p className="text-white/45 text-lg max-w-md mx-auto">
            Start free. Upgrade when you need more.
          </p>
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
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    {plan.price > 0 && <span className="text-white/35 text-sm mb-1">/mo</span>}
                  </div>
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
                    onClick={() => router.push("/lyra")}
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

        <p className="text-center text-white/25 text-xs mt-10">
          Cancel anytime · Secure payments via Stripe · No hidden fees
        </p>
      </div>
    </div>
  );
}
