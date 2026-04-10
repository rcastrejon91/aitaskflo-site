"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Bot, Zap, ArrowRight, GitBranch, Brain, ShieldCheck, Play,
  Truck, Gamepad2, BookOpen, Building2, GraduationCap, TrendingUp,
  CheckCircle, Users, Globe, ChevronRight, Star, Terminal, Check,
} from "lucide-react";
import DemoMode from "@/components/lyra/DemoMode";

// ── Demo window typing animation ─────────────────────────────────────────────

const DEMO_MESSAGES = [
  { role: "user",  text: "Build me a space shooter game" },
  { role: "lyra",  text: "On it. Generating Godot 4 scene with player ship, enemies, bullets, and a boss fight — with mobile controls." },
  { role: "system", text: "⚡ game_build • SpaceShooter.gd • 340 lines generated" },
  { role: "user",  text: "Now buy 5 shares of NVDA if it dips below $900" },
  { role: "lyra",  text: "Oracle checking live price… $887.40. Executing market buy via Alpaca — 5 shares at $887.40. Order filled." },
  { role: "system", text: "✅ trade_execute • NVDA × 5 • $4,437.00 filled" },
  { role: "user",  text: "Summarize my Gmail and draft a reply to the investor thread" },
  { role: "lyra",  text: "Found 3 unread investor emails. Drafting reply to Marcus at Gradient Ventures — referencing your $350K Google Cloud credit and Q1 traction." },
];

function DemoWindow() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= DEMO_MESSAGES.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), visible === 0 ? 600 : 1800);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#0d0d1a" }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <div className="ml-3 flex-1 rounded-md px-3 py-1 text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }}>
          aitaskflo.com/lyra
        </div>
      </div>
      {/* Chat */}
      <div className="p-5 space-y-3 min-h-[320px]">
        {DEMO_MESSAGES.slice(0, visible).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="px-3.5 py-2 rounded-2xl rounded-tr-sm text-sm max-w-xs" style={{ background: "rgba(109,40,217,0.35)", color: "rgba(255,255,255,0.9)" }}>
                  {msg.text}
                </div>
              </div>
            )}
            {msg.role === "lyra" && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="px-3.5 py-2 rounded-2xl rounded-tl-sm text-sm max-w-sm" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)" }}>
                  {msg.text}
                </div>
              </div>
            )}
            {msg.role === "system" && (
              <div className="flex justify-center">
                <div className="px-3 py-1 rounded-full text-xs font-mono" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "rgb(110,231,183)" }}>
                  {msg.text}
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {visible < DEMO_MESSAGES.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 pl-8">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(196,181,253,0.5)" }}
                animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Pricing section ───────────────────────────────────────────────────────────

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    desc: "Try Lyra with no commitment.",
    features: ["40 messages / day", "Image generation", "Web search", "Weather & news", "Basic memory"],
    cta: "Start free",
    href: "/login",
    featured: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: 29,
    desc: "For power users who want everything.",
    features: ["Unlimited messages", "Full persistent memory", "Email & calendar", "CRM (HubSpot)", "Job search & resume tools", "Stock trading (Alpaca)", "Priority routing"],
    cta: "Get Pro",
    href: "/pricing",
    featured: true,
  },
  {
    key: "business",
    name: "Business",
    price: 49,
    desc: "For teams and white-label deployments.",
    features: ["Everything in Pro", "White-label chat embed", "Knowledge base (RAG)", "API access", "Multiple users", "Analytics dashboard", "Priority support"],
    cta: "Get Business",
    href: "/pricing",
    featured: false,
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#080810" }}>
      <AnimatePresence>
        {showDemo && <DemoMode onClose={() => setShowDemo(false)} />}
      </AnimatePresence>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-[140px]" style={{ background: "rgba(109,40,217,0.12)" }} />
        <div className="absolute top-[30%] left-[-15%] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "rgba(134,25,143,0.07)" }} />
        <div className="absolute top-[50%] right-[-15%] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "rgba(79,70,229,0.07)" }} />
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
          <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            <Link href="/demo" className="hover:text-white transition-colors">Try Demo</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/careers" className="hover:text-white transition-colors">Careers</Link>
            <Link href="/investors" className="hover:text-white transition-colors">Investors</Link>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium" style={{ background: "rgba(109,40,217,0.1)", border: "1px solid rgba(109,40,217,0.25)", color: "rgb(196,181,253)" }}>
              <Sparkles className="w-3.5 h-3.5" />
              Backed by Google for Startups · AI Platform
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
              <span className="text-white">The AI that builds,</span>
              <br />
              <span style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(240,171,252), rgb(249,168,212))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                trades, and never forgets.
              </span>
            </h1>

            <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Lyra is a multi-agent AI platform with persistent memory, real stock trading, game building, adaptive learning, and white-label deployment — all in one place.
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

            {/* Social proof bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { stat: "$350K", label: "Google Cloud Credits" },
                { stat: "30+", label: "AI Tools Built-in" },
                { stat: "∞", label: "Memory Depth" },
                { stat: "$0", label: "To Start" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold mb-1" style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(240,171,252))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.stat}</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live demo window */}
      <section className="relative py-20 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "rgb(110,231,183)" }}>
              <Terminal className="w-3 h-3" />
              Live Preview
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Watch Lyra work in real time</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              One conversation. Game built, trade executed, email drafted.
            </p>
          </div>
          <DemoWindow />
          <div className="text-center mt-6">
            <Link href="/demo">
              <Button variant="ghost" className="text-white/40 hover:text-white text-sm gap-1.5">
                Try the interactive demo <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="relative py-24 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Every AI resets. Lyra remembers.</h2>
          <p className="text-lg max-w-2xl mx-auto mb-16" style={{ color: "rgba(255,255,255,0.38)" }}>
            Traditional AI tools forget you the moment the chat ends. You repeat yourself every session. You get generic answers.
            Lyra is different — she builds a model of you over time.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "She remembers you", desc: "Every conversation builds context. Your preferences, projects, and goals are never forgotten.", color: "rgb(196,181,253)" },
              { step: "02", title: "She reflects & improves", desc: "After every session Lyra scores herself, identifies what she could do better, and evolves.", color: "rgb(240,171,252)" },
              { step: "03", title: "She adapts to your brain", desc: "Visual learner? ADHD? Hands-on? Lyra silently detects how you learn and teaches accordingly.", color: "rgb(249,168,212)" },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl p-6 text-left" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-xs font-mono mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>{s.step}</div>
                <h3 className="font-semibold mb-2" style={{ color: s.color }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform showcase */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium" style={{ background: "rgba(109,40,217,0.1)", border: "1px solid rgba(109,40,217,0.2)", color: "rgb(196,181,253)" }}>
              Full Platform
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">One AI. Every tool you need.</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Lyra isn&apos;t just a chat window. It&apos;s a full platform built for real use cases.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Brain className="w-5 h-5" />,
                title: "Adaptive Learning",
                desc: "Lyra detects how your brain works — visual, hands-on, step-by-step — and teaches accordingly. No quiz. No setup.",
                tag: "New",
                iconBg: "rgba(109,40,217,0.12)", iconBorder: "rgba(109,40,217,0.25)", iconColor: "rgb(196,181,253)",
                href: "/learn",
              },
              {
                icon: <Gamepad2 className="w-5 h-5" />,
                title: "Game Builder",
                desc: "Describe a game and Lyra builds it — complete browser game with enemies, boss fights, audio, and mobile controls.",
                tag: "Popular",
                iconBg: "rgba(236,72,153,0.1)", iconBorder: "rgba(236,72,153,0.25)", iconColor: "rgb(249,168,212)",
                href: "/games",
              },
              {
                icon: <Truck className="w-5 h-5" />,
                title: "Trucking Tools",
                desc: "Full HOS compliance tracker, DAT load board search, OBD diagnostics, and voice commands — built for truckers.",
                tag: "Industry",
                iconBg: "rgba(234,179,8,0.1)", iconBorder: "rgba(234,179,8,0.25)", iconColor: "rgb(252,211,77)",
                href: "/trucker",
              },
              {
                icon: <GraduationCap className="w-5 h-5" />,
                title: "Learn Platform",
                desc: "10 subjects from Math to AI. Lyra adapts her teaching style to you — shorter steps, visuals, gentle pacing.",
                tag: null,
                iconBg: "rgba(6,182,212,0.1)", iconBorder: "rgba(6,182,212,0.25)", iconColor: "rgb(103,232,249)",
                href: "/learn",
              },
              {
                icon: <Building2 className="w-5 h-5" />,
                title: "White Label",
                desc: "Deploy your own branded Lyra for your business or agency. Custom tools, custom persona, your domain.",
                tag: "Business",
                iconBg: "rgba(16,185,129,0.1)", iconBorder: "rgba(16,185,129,0.25)", iconColor: "rgb(110,231,183)",
                href: "/agency",
              },
              {
                icon: <TrendingUp className="w-5 h-5" />,
                title: "Stock Trading",
                desc: "Live Alpaca trading, Oracle market intelligence, and strategy backtesting — all via natural language.",
                tag: "Pro",
                iconBg: "rgba(79,70,229,0.12)", iconBorder: "rgba(79,70,229,0.25)", iconColor: "rgb(165,180,252)",
                href: "/lyra",
              },
            ].map((f) => (
              <Link key={f.title} href={f.href}>
                <div className="rounded-2xl p-5 transition-all cursor-pointer h-full" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = f.iconBorder; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.025)"; }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: f.iconBg, border: `1px solid ${f.iconBorder}` }}>
                      <span style={{ color: f.iconColor }}>{f.icon}</span>
                    </div>
                    {f.tag && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: f.iconBg, border: `1px solid ${f.iconBorder}`, color: f.iconColor }}>
                        {f.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white mb-2 text-[15px]">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{f.desc}</p>
                  <div className="flex items-center gap-1 mt-4 text-xs" style={{ color: f.iconColor }}>
                    <span>Explore</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Lyra */}
      <section className="relative py-24 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Why Lyra over ChatGPT?</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Generic AI tools are built for everyone. Lyra is built for you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Remembers you across sessions", desc: "No more re-explaining your projects, preferences, or context." },
              { title: "Evolves and self-improves", desc: "Lyra reflects on every conversation and gets better over time." },
              { title: "Learns how YOUR brain works", desc: "Adapts teaching style, pacing, and format to match you specifically." },
              { title: "Domain-specific tools built in", desc: "Trucking, games, education, business — not just a generic chatbox." },
              { title: "White-label for your business", desc: "Deploy branded AI for your team or customers with custom tools." },
              { title: "Real actions, not just words", desc: "Lyra executes trades, sends emails, builds games — not just talks." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "rgb(110,231,183)" }} />
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative py-24 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">What people are saying</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Real users. Real workflows.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: "Jordan M.",
                role: "Independent Trucker, Texas",
                avatar: "JM",
                quote: "I use Lyra for HOS tracking and load searching every day. It's the only AI that actually knows my industry. Saved me hours a week.",
                color: "rgba(234,179,8,0.15)",
                border: "rgba(234,179,8,0.2)",
              },
              {
                name: "Priya S.",
                role: "Founder, EdTech Startup",
                avatar: "PS",
                quote: "We white-labeled Lyra for our learning platform in 3 days. The knowledge base + custom persona made it feel completely native.",
                color: "rgba(109,40,217,0.15)",
                border: "rgba(109,40,217,0.25)",
                featured: true,
              },
              {
                name: "Alex T.",
                role: "Retail Trader",
                avatar: "AT",
                quote: "The Oracle + backtester combo is insane. I told Lyra my strategy, she backtested it, found the flaw, and now I'm actually profitable.",
                color: "rgba(16,185,129,0.1)",
                border: "rgba(16,185,129,0.2)",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: t.color, border: `1px solid ${t.border}` }}>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: "rgb(251,191,36)" }} />)}
                </div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "rgba(255,255,255,0.7)" }}>&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-24 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium" style={{ background: "rgba(109,40,217,0.1)", border: "1px solid rgba(109,40,217,0.2)", color: "rgb(196,181,253)" }}>
              Simple Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Start free. Scale when ready.</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              No hidden fees. Cancel anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan) => (
              <div key={plan.key} className="rounded-2xl p-6 flex flex-col relative" style={{
                background: plan.featured ? "rgba(109,40,217,0.12)" : "rgba(255,255,255,0.025)",
                border: plan.featured ? "1px solid rgba(109,40,217,0.4)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: plan.featured ? "0 0 40px rgba(109,40,217,0.1)" : undefined,
              }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", color: "white" }}>
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{plan.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    {plan.price > 0 && <span className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>/mo</span>}
                    {plan.price === 0 && <span className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>forever</span>}
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.featured ? "rgb(196,181,253)" : "rgb(110,231,183)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className="block">
                  <Button className="w-full font-semibold" style={plan.featured ? {
                    background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))",
                    color: "white",
                    border: "none",
                    boxShadow: "0 4px 16px rgba(109,40,217,0.3)",
                  } : {
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Looking for agency or enterprise pricing? <Link href="/pricing" className="underline hover:text-white/50">See all plans →</Link>
          </p>
        </div>
      </section>

      {/* For Investors */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl p-10 sm:p-14" style={{ background: "rgba(109,40,217,0.06)", border: "1px solid rgba(109,40,217,0.15)", boxShadow: "0 0 80px rgba(109,40,217,0.06)" }}>
            <div className="flex flex-col sm:flex-row items-start gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium" style={{ background: "rgba(109,40,217,0.1)", border: "1px solid rgba(109,40,217,0.2)", color: "rgb(196,181,253)" }}>
                  <TrendingUp className="w-3 h-3" />
                  For Investors
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Building the AI platform that adapts to the human — not the other way around.</h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
                  AITaskFlo is building Lyra — a self-improving AI platform with persistent memory, adaptive learning, and domain-specific tooling across education, logistics, gaming, and enterprise. Backed by Google for Startups Cloud Program.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { stat: "$350K", label: "Google Cloud Credits" },
                    { stat: "30+", label: "AI Tools" },
                    { stat: "2026", label: "Founded" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-xl font-bold text-white">{s.stat}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <Link href="/investors">
                  <Button className="text-white border-0 font-semibold" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))" }}>
                    Investor Overview
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col gap-3 sm:w-48">
                {[
                  { icon: <Globe className="w-4 h-4" />, text: "aitaskflo.com" },
                  { icon: <Users className="w-4 h-4" />, text: "Ricardo Castrejon, CEO" },
                  { icon: <Zap className="w-4 h-4" />, text: "AI — Generative" },
                  { icon: <ShieldCheck className="w-4 h-4" />, text: "Google for Startups" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ color: "rgb(196,181,253)" }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6" style={{ boxShadow: "0 8px 32px rgba(109,40,217,0.35)" }}>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Start building with Lyra today</h2>
          <p className="mb-8 text-lg" style={{ color: "rgba(255,255,255,0.38)" }}>Free to start. No credit card. Gets smarter every conversation.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="text-white border-0 font-semibold px-10 h-12 text-base shadow-2xl" style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 8px 32px rgba(109,40,217,0.3)" }}>
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="ghost" className="text-white/50 hover:text-white h-12 px-8">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>AITaskFlo</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Link href="/lyra" className="hover:text-white/60 transition-colors">Chat</Link>
              <Link href="/learn" className="hover:text-white/60 transition-colors">Learn</Link>
              <Link href="/games" className="hover:text-white/60 transition-colors">Games</Link>
              <Link href="/trucker" className="hover:text-white/60 transition-colors">Trucking</Link>
              <Link href="/agency" className="hover:text-white/60 transition-colors">Agency</Link>
              <Link href="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
              <Link href="/careers" className="hover:text-white/60 transition-colors">Careers</Link>
              <Link href="/investors" className="hover:text-white/60 transition-colors">Investors</Link>
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
              <a href="mailto:rcastrejon@aitaskflo.com" className="hover:text-white/60 transition-colors">Contact</a>
            </div>
          </div>
          <div className="text-center text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
            © 2026 AITaskFlo. Built with Lyra.
          </div>
        </div>
      </footer>
    </div>
  );
}
