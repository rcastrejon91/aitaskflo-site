"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, Zap, ArrowRight, GitBranch, Brain, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#080810" }}>

      {/* Background decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-[140px]" style={{ background: "rgba(109,40,217,0.12)" }} />
        <div className="absolute top-[30%] left-[-15%] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "rgba(134,25,143,0.07)" }} />
        <div className="absolute top-[50%] right-[-15%] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "rgba(79,70,229,0.07)" }} />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)",
          backgroundSize: "44px 44px"
        }} />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl" style={{ background: "rgba(8,8,16,0.85)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 16px rgba(109,40,217,0.35)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ background: "linear-gradient(to right, #fff, rgba(255,255,255,0.6))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AITaskFlo
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/50 hover:text-white hover:bg-white/[0.06]">
                Sign in
              </Button>
            </Link>
            <Link href="/pricing">
              <Button className="text-white border-0 font-semibold shadow-lg" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 4px 16px rgba(109,40,217,0.3)" }}>
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div className="max-w-4xl mx-auto px-6 text-center">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium" style={{ background: "rgba(109,40,217,0.1)", border: "1px solid rgba(109,40,217,0.25)", color: "rgb(196,181,253)" }}>
            <Sparkles className="w-3.5 h-3.5" />
            Self-Improving AI Platform
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6 leading-[1.05]">
            <span className="text-white">AI that learns</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(240,171,252), rgb(249,168,212))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              as it works
            </span>
          </h1>

          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            Meet Lyra — an AI that builds persistent memory, reflects on every conversation, and evolves into smarter versions of itself.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/pricing">
              <Button size="lg" className="text-white border-0 font-semibold px-8 h-12 text-base shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.3)" }}>
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.65)" }}>
                Sign in
              </Button>
            </Link>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { icon: <Sparkles className="w-3.5 h-3.5" />, text: "Self-Improving", bg: "rgba(109,40,217,0.1)", border: "rgba(109,40,217,0.25)", color: "rgb(196,181,253)" },
              { icon: <Brain className="w-3.5 h-3.5" />, text: "Persistent Memory", bg: "rgba(134,25,143,0.1)", border: "rgba(134,25,143,0.25)", color: "rgb(240,171,252)" },
              { icon: <GitBranch className="w-3.5 h-3.5" />, text: "Lineage Evolution", bg: "rgba(79,70,229,0.1)", border: "rgba(79,70,229,0.25)", color: "rgb(165,180,252)" },
              { icon: <Zap className="w-3.5 h-3.5" />, text: "Reflection Engine", bg: "rgba(161,98,7,0.15)", border: "rgba(161,98,7,0.3)", color: "rgb(252,211,77)" },
            ].map((b) => (
              <span key={b.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: b.bg, border: `1px solid ${b.border}`, color: b.color }}>
                {b.icon} {b.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built to get smarter over time</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Every conversation makes Lyra more capable, more personalized, more effective.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Brain className="w-5 h-5" />,
                title: "Persistent Memory",
                desc: "Lyra remembers context across sessions — no need to re-explain who you are or what you're working on.",
                iconBg: "rgba(109,40,217,0.12)", iconBorder: "rgba(109,40,217,0.25)", iconColor: "rgb(196,181,253)",
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                title: "Reflection Engine",
                desc: "After each conversation, Lyra scores itself, identifies gaps, and extracts lessons to improve future interactions.",
                iconBg: "rgba(134,25,143,0.12)", iconBorder: "rgba(134,25,143,0.25)", iconColor: "rgb(240,171,252)",
              },
              {
                icon: <GitBranch className="w-5 h-5" />,
                title: "Agent Evolution",
                desc: "When ready, Lyra evolves into an improved version — preserving lineage while upgrading its core.",
                iconBg: "rgba(79,70,229,0.12)", iconBorder: "rgba(79,70,229,0.25)", iconColor: "rgb(165,180,252)",
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: "Instant Automation",
                desc: "Execute real tasks: draft emails, write content, build workflows — all through natural language.",
                iconBg: "rgba(161,98,7,0.15)", iconBorder: "rgba(161,98,7,0.3)", iconColor: "rgb(252,211,77)",
              },
              {
                icon: <Bot className="w-5 h-5" />,
                title: "Agent Lineage",
                desc: "Visualize the full evolution tree of your AI — see every generation and switch between them.",
                iconBg: "rgba(236,72,153,0.1)", iconBorder: "rgba(236,72,153,0.25)", iconColor: "rgb(249,168,212)",
              },
              {
                icon: <ShieldCheck className="w-5 h-5" />,
                title: "Private & Isolated",
                desc: "Your data, memories, and conversations are fully isolated to your account. No shared state.",
                iconBg: "rgba(16,185,129,0.1)", iconBorder: "rgba(16,185,129,0.25)", iconColor: "rgb(110,231,183)",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl p-5 transition-all" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: f.iconBg, border: `1px solid ${f.iconBorder}` }}>
                  <span style={{ color: f.iconColor }}>{f.icon}</span>
                </div>
                <h3 className="font-semibold text-white mb-2 text-[15px]">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-3xl p-12" style={{ background: "rgba(109,40,217,0.07)", border: "1px solid rgba(109,40,217,0.18)", boxShadow: "0 0 80px rgba(109,40,217,0.07)" }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Start building today</h2>
            <p className="mb-8" style={{ color: "rgba(255,255,255,0.38)" }}>Your AI gets better with every message.</p>
            <Link href="/pricing">
              <Button size="lg" className="text-white border-0 font-semibold px-10 h-12 text-base shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.3)" }}>
                View Plans
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>AITaskFlo</span>
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>Powered by Claude</span>
        </div>
      </footer>
    </div>
  );
}
