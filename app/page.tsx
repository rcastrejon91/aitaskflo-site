"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, Zap, ArrowRight, GitBranch, Brain, ShieldCheck, Play } from "lucide-react";
import DemoMode from "@/components/lyra/DemoMode";

export default function Home() {
  const [showDemo, setShowDemo] = useState(false);
  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#080810" }}>
      <AnimatePresence>
        {showDemo && <DemoMode onClose={() => setShowDemo(false)} />}
      </AnimatePresence>

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
            <span className="text-white">AI that actually learns</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(240,171,252), rgb(249,168,212))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              how to help you
            </span>
          </h1>

          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            Meet Lyra, an AI that remembers what matters, improves from every conversation, and becomes more useful the more you use it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/login">
              <Button size="lg" className="text-white border-0 font-semibold px-8 h-12 text-base shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}>
                Start for free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setShowDemo(true)}
              className="text-white/60 hover:text-white hover:bg-white/[0.06] h-12 px-8 text-base flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Watch Lyra Work
            </Button>
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
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built to improve over time</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Most AI tools reset every conversation. Lyra builds understanding as you use it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Brain className="w-5 h-5" />,
                title: "Persistent Memory",
                desc: "Lyra remembers context across conversations so you do not have to repeat yourself. It understands your preferences, projects, and priorities.",
                iconBg: "rgba(109,40,217,0.12)", iconBorder: "rgba(109,40,217,0.25)", iconColor: "rgb(196,181,253)",
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                title: "Reflection Engine",
                desc: "Lyra reviews conversations to understand what worked well and what could be improved. Each interaction helps it respond more clearly next time.",
                iconBg: "rgba(134,25,143,0.12)", iconBorder: "rgba(134,25,143,0.25)", iconColor: "rgb(240,171,252)",
              },
              {
                icon: <GitBranch className="w-5 h-5" />,
                title: "Agent Evolution",
                desc: "Lyra can improve itself while keeping everything it has already learned. You keep the progress while gaining better performance.",
                iconBg: "rgba(79,70,229,0.12)", iconBorder: "rgba(79,70,229,0.25)", iconColor: "rgb(165,180,252)",
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: "Real Automation",
                desc: "Lyra does more than respond with text. It can help draft emails, research information, generate content, and assist with workflows.",
                iconBg: "rgba(161,98,7,0.15)", iconBorder: "rgba(161,98,7,0.3)", iconColor: "rgb(252,211,77)",
              },
              {
                icon: <Bot className="w-5 h-5" />,
                title: "Agent Lineage",
                desc: "You can see how Lyra improves over time. Track changes, compare versions, and understand how your AI becomes more capable.",
                iconBg: "rgba(236,72,153,0.1)", iconBorder: "rgba(236,72,153,0.25)", iconColor: "rgb(249,168,212)",
              },
              {
                icon: <ShieldCheck className="w-5 h-5" />,
                title: "Private by Design",
                desc: "Your data and conversations stay connected only to your account. Your memory and activity are not shared with other users.",
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
            <p className="mb-8" style={{ color: "rgba(255,255,255,0.38)" }}>Your AI becomes more useful with every interaction.</p>
            <Link href="/pricing">
              <Button size="lg" className="text-white border-0 font-semibold px-10 h-12 text-base shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.3)" }}>
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="py-12 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { stat: "10k+", label: "Messages sent" },
              { stat: "3", label: "AI models" },
              { stat: "∞", label: "Memory depth" },
              { stat: "$0", label: "To start" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold mb-1" style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(240,171,252))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.stat}</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>AITaskFlo</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            <span>© 2026 AITaskFlo</span>
            <Link href="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign in</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <a href="mailto:support@aitaskflo.com" className="hover:text-white/60 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
