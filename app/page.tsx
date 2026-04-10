"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Bot, Zap, ArrowRight, GitBranch, Brain, ShieldCheck, Play,
  Truck, Gamepad2, BookOpen, Building2, GraduationCap, TrendingUp,
  CheckCircle, Users, Globe, ChevronRight,
} from "lucide-react";
import DemoMode from "@/components/lyra/DemoMode";

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
              <span className="text-white">Meet Lyra.</span>
              <br />
              <span style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(240,171,252), rgb(249,168,212))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                The AI that grows with you.
              </span>
            </h1>

            <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Not just a chatbot. An AI platform with persistent memory, adaptive learning, game building, trucking tools, and more — that gets smarter every time you use it.
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

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
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
                <h3 className="font-semibold text-white mb-2" style={{ color: s.color }}>{s.title}</h3>
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
                desc: "10 subjects from Math to AI. Lyra adapts her teaching style to you — shorter steps, visuals, gentle pacing, whatever you need.",
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
                icon: <GitBranch className="w-5 h-5" />,
                title: "Agent Evolution",
                desc: "Lyra evolves over time — improving her responses, building on what she's learned, tracked through a visual lineage graph.",
                tag: null,
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

      {/* Why Lyra vs others */}
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
              { icon: <CheckCircle className="w-4 h-4" />, title: "Remembers you across sessions", desc: "No more re-explaining your projects, preferences, or context." },
              { icon: <CheckCircle className="w-4 h-4" />, title: "Evolves and self-improves", desc: "Lyra reflects on every conversation and gets better over time." },
              { icon: <CheckCircle className="w-4 h-4" />, title: "Learns how YOUR brain works", desc: "Adapts teaching style, pacing, and format to match you specifically." },
              { icon: <CheckCircle className="w-4 h-4" />, title: "Domain-specific tools built in", desc: "Trucking, games, education, business — not just a generic chatbox." },
              { icon: <CheckCircle className="w-4 h-4" />, title: "White-label for your business", desc: "Deploy branded AI for your team or customers with custom tools." },
              { icon: <CheckCircle className="w-4 h-4" />, title: "Lives math and code visualizations", desc: "Lyra summons live animated mathematics right in the chat." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "rgb(110,231,183)", marginTop: 2 }}>{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
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

      {/* CTA */}
      <section className="relative py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Start building with Lyra today</h2>
          <p className="mb-8" style={{ color: "rgba(255,255,255,0.38)" }}>Free to start. She gets smarter every conversation.</p>
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
