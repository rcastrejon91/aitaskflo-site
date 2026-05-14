"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Scroll reveal ─────────────────────────────────────────────────────────────

function useInView<T extends Element = HTMLDivElement>(threshold = 0.08) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties; }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Count-up stat ─────────────────────────────────────────────────────────────

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.2);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const dur = 1600;
    const step = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Starfield ─────────────────────────────────────────────────────────────────

function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf: number;
    let t = 0;

    type Star = { x: number; y: number; z: number; size: number; op: number; ts: number; to: number };
    type Shooter = { x: number; y: number; vx: number; vy: number; len: number; op: number; life: number };
    let stars: Star[] = [];
    let shooters: Shooter[] = [];

    const R = (a: number, b: number) => Math.random() * (b - a) + a;

    function init() {
      c!.width = c!.offsetWidth; c!.height = c!.offsetHeight;
      stars = Array.from({ length: 260 }, () => {
        const z = R(0, 1);
        return { x: R(0, c!.width), y: R(0, c!.height), z, size: 0.3 + z * 1.9, op: 0.1 + z * 0.7, ts: R(0.4, 1.8), to: R(0, Math.PI * 2) };
      });
    }

    function spawnShooter() {
      const fromTop = Math.random() > 0.4;
      const x = fromTop ? R(0, c!.width) : -20;
      const y = fromTop ? -10 : R(0, c!.height * 0.5);
      const a = R(25, 55) * (Math.PI / 180), sp = R(5, 10);
      shooters.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, len: R(80, 160), op: R(0.5, 0.9), life: 1 });
    }

    function draw() {
      if (!c || !ctx) return; t += 0.016;
      ctx.clearRect(0, 0, c.width, c.height);

      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * s.ts + s.to);
        const alpha = s.op * (0.6 + 0.4 * tw);
        if (s.z > 0.7) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3.5);
          g.addColorStop(0, `rgba(200,180,255,${alpha})`);
          g.addColorStop(0.4, `rgba(180,160,255,${alpha * 0.35})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (0.85 + 0.15 * tw), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,210,255,${alpha})`; ctx.fill();
      }

      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.x += sh.vx; sh.y += sh.vy; sh.life -= 0.018;
        if (sh.life <= 0 || sh.x > c.width + 50 || sh.y > c.height + 50) { shooters.splice(i, 1); continue; }
        const alpha = sh.op * sh.life;
        const mag = Math.hypot(sh.vx, sh.vy);
        const tx = sh.x - (sh.vx / mag) * sh.len, ty = sh.y - (sh.vy / mag) * sh.len;
        const g = ctx.createLinearGradient(tx, ty, sh.x, sh.y);
        g.addColorStop(0, "rgba(200,180,255,0)"); g.addColorStop(0.7, `rgba(220,200,255,${alpha * 0.4})`); g.addColorStop(1, `rgba(255,255,255,${alpha})`);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sh.x, sh.y);
        ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    let timer: ReturnType<typeof setTimeout>;
    function schedule() { timer = setTimeout(() => { spawnShooter(); schedule(); }, R(3000, 7000)); }

    const ro = new ResizeObserver(init); ro.observe(c);
    init(); draw(); schedule();
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.65 }} />;
}

// ── Typing demo ───────────────────────────────────────────────────────────────

const DEMO = [
  { r: "user", t: "Build me a space shooter game in Godot 4" },
  { r: "lyra", t: "Generating player ship, enemies, bullets, boss fight + mobile controls…" },
  { r: "sys",  t: "⚡ game_build · SpaceShooter.gd · 340 lines" },
  { r: "user", t: "Buy 5 NVDA shares if it dips below $900" },
  { r: "lyra", t: "Price: $887.40. Executing via Alpaca — 5 × $887.40. Order filled." },
  { r: "sys",  t: "✅ trade_execute · NVDA ×5 · $4,437 filled" },
  { r: "user", t: "Summarize Gmail and draft reply to investor thread" },
  { r: "lyra", t: "3 unread. One needs a reply. Drafting response — referencing your last meeting notes and Q1 numbers." },
];

function LiveDemo() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible >= DEMO.length) { const t = setTimeout(() => setVisible(0), 2800); return () => clearTimeout(t); }
    const t = setTimeout(() => setVisible(v => v + 1), visible === 0 ? 500 : 1700);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div style={{
      borderRadius: "18px", overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.025)",
      backdropFilter: "blur(20px)",
      boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
        {["#E24B4A","#EF9F27","#639922"].map(c => <div key={c} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c, opacity: 0.8 }} />)}
        <span style={{ marginLeft: "8px", fontSize: "11px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>aitaskflo.com/lyra</span>
      </div>
      <div style={{ padding: "20px", minHeight: "300px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {DEMO.slice(0, visible).map((m, i) => (
          <div key={i} style={{ animation: "fadeUp 0.25s ease" }}>
            {m.r === "user" && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "rgba(109,40,217,0.35)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "14px 14px 3px 14px", padding: "9px 14px", fontSize: "13px", color: "rgba(255,255,255,0.88)", maxWidth: "75%" }}>{m.t}</div>
              </div>
            )}
            {m.r === "lyra" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,rgb(109,40,217),rgb(20,184,166))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>✦</div>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px 14px 14px 3px", padding: "9px 14px", fontSize: "13px", color: "rgba(255,255,255,0.72)", maxWidth: "80%" }}>{m.t}</div>
              </div>
            )}
            {m.r === "sys" && (
              <div style={{ textAlign: "center" }}>
                <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "100px", fontSize: "11px", fontFamily: "monospace", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)", color: "rgb(94,234,212)" }}>{m.t}</span>
              </div>
            )}
          </div>
        ))}
        {visible < DEMO.length && (
          <div style={{ display: "flex", gap: "4px", paddingLeft: "33px" }}>
            {[0,1,2].map(i => <span key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(139,92,246,0.6)", animation: `bounce 1s ${i*0.15}s ease-in-out infinite` }} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "🧠", title: "Persistent memory", desc: "Carries full context across every session. Your projects, preferences, patterns — no re-explaining.", glow: "rgba(139,92,246,0.25)" },
  { icon: "🔁", title: "Reflection engine", desc: "Reviews every conversation and refines how it responds to you. Gets sharper every week.", glow: "rgba(20,184,166,0.2)" },
  { icon: "⚡", title: "Real automation", desc: "Sends emails, searches the web, generates images, coordinates multi-step workflows.", glow: "rgba(251,191,36,0.18)" },
  { icon: "🎓", title: "Skill learning", desc: "Encounters something new? Lyra writes and saves a skill on the spot and remembers it forever.", glow: "rgba(94,234,212,0.18)" },
  { icon: "🌐", title: "Browser agent", desc: "Opens sites, clicks around, fills forms, extracts data — anything you can do in a browser.", glow: "rgba(56,189,248,0.2)" },
  { icon: "📈", title: "Agent evolution", desc: "Improves her own architecture over time. Every generation, every change — full transparency.", glow: "rgba(167,139,250,0.22)" },
];

const PLANS = [
  { name: "Free", price: "$0", sub: "forever", features: ["40 messages / day", "Persistent memory", "Image generation", "Web search"], cta: "Get started free", href: "/login", accent: false },
  { name: "Pro", price: "$29", sub: "/ month", features: ["Unlimited messages", "Full automation suite", "Google Drive + Calendar", "Agent evolution", "Image + video generation", "Browser agent"], cta: "Start Pro", href: "/login?plan=pro", accent: true },
  { name: "Business", price: "$49", sub: "/ month", features: ["Everything in Pro", "Multi-agent workflows", "Skill factory", "Admin analytics", "API access"], cta: "Get Business", href: "/login?plan=business", accent: false },
];

const INTEGRATIONS = [
  "Gmail", "Google Drive", "Google Calendar", "Slack", "Shopify",
  "HubSpot", "Stripe", "Alpaca Markets", "TikTok", "Instagram",
  "Facebook", "fal.ai", "Anthropic Claude", "OpenAI", "Groq",
  "Playwright", "Godot 4", "Three.js", "Phaser", "React",
];

const HOW_IT_WORKS = [
  { num: "01", title: "Chat naturally", desc: "Tell Lyra what you need in plain English. No commands, no setup — just talk.", icon: "💬" },
  { num: "02", title: "Lyra remembers & learns", desc: "Every session builds on the last. Lyra tracks your projects, preferences, and patterns permanently.", icon: "🧠" },
  { num: "03", title: "Lyra executes the work", desc: "Not just answers — real actions. Emails sent, trades placed, games built, code deployed.", icon: "⚡" },
];

const FAQS = [
  { q: "What does 'real automation' actually mean?", a: "Lyra can send emails, place trades, search the web, fill out forms, and run code — not just suggest it. Ask it to send an email and it sends it. No copy-pasting required." },
  { q: "How is Lyra different from ChatGPT or Claude?", a: "Those models reset every session — they have no memory of you. Lyra builds a persistent profile across every conversation, learns your patterns, and can actually execute tasks in the world." },
  { q: "Is my data private?", a: "Yes. Your memory, conversations, and connected accounts are private to your account and are never used to train models for other users." },
  { q: "Does the free tier ever expire?", a: "No. The free tier is free forever with 40 messages per day. Upgrade to Pro when you want unlimited messages and the full automation suite." },
  { q: "What happens if Lyra makes a mistake?", a: "Lyra confirms before taking irreversible actions like sending emails or placing trades. You stay in control at every step." },
];

const EYEBROW_PHRASES = [
  "Build games on demand",
  "Execute stock trades",
  "Draft & send emails",
  "Automate workflows",
  "Remember everything",
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);

  useEffect(() => {
    const tick = setInterval(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % EYEBROW_PHRASES.length);
        setPhraseVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(tick);
  }, []);

  // Close mobile menu on nav
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Helvetica Neue', sans-serif", background: "#08080f", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes phraseIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes phraseOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-6px)} }
        @keyframes pulseGlow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        a { color: inherit; }
        .site-nav { gap: 1rem; }
        .site-nav-links { min-width: 0; }
        .hero-copy { padding-top: 8rem; }
        .section-shell { scroll-margin-top: 88px; }
        .hamburger { display: none; }
        .feature-card { transition: background 0.25s, box-shadow 0.25s, transform 0.25s; }
        .feature-card:hover { transform: translateY(-2px); }
        .step-line { display: block; }
        @media (max-width: 820px) {
          .site-nav { height: auto !important; padding: 0.85rem 1rem !important; }
          .site-nav-links { gap: 0.5rem !important; }
          .site-nav-secondary { display: none !important; }
          .site-nav-link { padding: 8px 11px !important; font-size: 12px !important; }
          .hero-copy { padding: 7rem 1rem 3rem !important; }
          .hero-eyebrow { margin-bottom: 1.25rem !important; }
          .hero-copy h1 { letter-spacing: -1px !important; }
          .proof-strip { gap: 1.25rem !important; }
          .preview-section, .feature-section, .testimonial-section, .pricing-section { padding-left: 1rem !important; padding-right: 1rem !important; }
          .footer-links { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
          .hamburger { display: flex !important; }
          .desktop-cta { display: none !important; }
          .step-line { display: none !important; }
          .how-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* MOBILE MENU OVERLAY */}
      {mobileOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,8,15,0.97)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", padding: "1.5rem", animation: "slideDown 0.25s ease" }}
          onClick={() => setMobileOpen(false)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "16px", fontWeight: 600 }}>
              <span style={{ color: "rgba(255,255,255,0.9)" }}>AITaskFlo</span>
              <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 6px" }}>/</span>
              <span style={{ background: "linear-gradient(90deg, rgb(167,139,250), rgb(94,234,212))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Lyra</span>
            </div>
            <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "24px", cursor: "pointer", padding: "4px 8px" }}>✕</button>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "Demo", href: "/demo" },
            ].map(item => (
              <a key={item.label} href={item.href} onClick={() => setMobileOpen(false)} style={{ textDecoration: "none", padding: "1rem 0.5rem", fontSize: "22px", fontWeight: 500, color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "block" }}>{item.label}</a>
            ))}
          </nav>
          <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", gap: "12px" }}>
            <Link href="/login" onClick={() => setMobileOpen(false)} style={{ textDecoration: "none", padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: "15px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>Sign in</Link>
            <Link href="/login" onClick={() => setMobileOpen(false)} style={{ textDecoration: "none", padding: "14px", borderRadius: "10px", background: "linear-gradient(135deg,rgb(109,40,217),rgb(134,25,143))", color: "#fff", fontSize: "15px", fontWeight: 500, boxShadow: "0 0 30px rgba(109,40,217,0.45)", textAlign: "center" }}>Get started free</Link>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="site-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", height: "60px", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", background: "rgba(8,8,15,0.7)" }}>
        <div style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.3px" }}>
          <span style={{ color: "rgba(255,255,255,0.9)" }}>AITaskFlo</span>
          <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 6px" }}>/</span>
          <span style={{ background: "linear-gradient(90deg, rgb(167,139,250), rgb(94,234,212))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Lyra</span>
        </div>
        <div className="site-nav-links" style={{ display: "flex", alignItems: "center", gap: "2rem", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
          <a className="site-nav-secondary" href="#features" style={{ textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color="#fff")} onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,0.4)")}>Features</a>
          <a className="site-nav-secondary" href="#pricing" style={{ textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color="#fff")} onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,0.4)")}>Pricing</a>
          <Link className="site-nav-secondary" href="/demo" style={{ textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color="#fff")} onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,0.4)")}>Demo</Link>
          <Link className="site-nav-link desktop-cta" href="/login" style={{ textDecoration: "none", padding: "7px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: "13px", transition: "border-color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.borderColor="rgba(255,255,255,0.3)")} onMouseLeave={e => (e.currentTarget.style.borderColor="rgba(255,255,255,0.12)")}>Sign in</Link>
          <Link className="site-nav-link desktop-cta" href="/login" style={{ textDecoration: "none", padding: "7px 16px", borderRadius: "8px", background: "linear-gradient(135deg,rgb(109,40,217),rgb(134,25,143))", color: "#fff", fontSize: "13px", fontWeight: 500, boxShadow: "0 0 20px rgba(109,40,217,0.4)" }}>Get started</Link>
          {/* Hamburger */}
          <button
            className="hamburger"
            onClick={() => setMobileOpen(true)}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "7px 10px", cursor: "pointer", display: "none", flexDirection: "column", gap: "4px", color: "rgba(255,255,255,0.7)" }}
            aria-label="Open menu"
          >
            <span style={{ display: "block", width: "18px", height: "1.5px", background: "currentColor", borderRadius: "2px" }} />
            <span style={{ display: "block", width: "18px", height: "1.5px", background: "currentColor", borderRadius: "2px" }} />
            <span style={{ display: "block", width: "14px", height: "1.5px", background: "currentColor", borderRadius: "2px" }} />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Starfield />

        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(109,40,217,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "0", left: "10%", width: "500px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(20,184,166,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="hero-copy" style={{ position: "relative", textAlign: "center", padding: "8rem 1.5rem 4rem", maxWidth: "860px", margin: "0 auto" }}>
          {/* rotating eyebrow */}
          <div className="hero-eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 14px 5px 8px", borderRadius: "100px", border: "1px solid rgba(139,92,246,0.3)", background: "rgba(109,40,217,0.12)", fontSize: "12px", color: "rgba(196,181,253,0.9)", marginBottom: "2rem", backdropFilter: "blur(10px)", minWidth: "220px", justifyContent: "center" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgb(20,184,166)", boxShadow: "0 0 8px rgb(20,184,166)", display: "inline-block", flexShrink: 0, animation: "pulseGlow 2s ease-in-out infinite" }} />
            <span style={{ animation: phraseVisible ? "phraseIn 0.3s ease forwards" : "phraseOut 0.3s ease forwards", display: "inline-block" }}>
              {EYEBROW_PHRASES[phraseIdx]}
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4.2rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-2px", margin: "0 0 1.5rem" }}>
            The AI that builds a{" "}
            <span style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(94,234,212))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>world around you</span>
          </h1>

          <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: "520px", margin: "0 auto 2.5rem" }}>
            Lyra remembers everything, learns from every conversation, and actually executes — emails, trades, research, code. Not just answers.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{ textDecoration: "none", padding: "13px 28px", borderRadius: "10px", background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", color: "#fff", fontSize: "15px", fontWeight: 500, boxShadow: "0 0 30px rgba(109,40,217,0.45)", transition: "box-shadow 0.2s, transform 0.2s" }} onMouseEnter={e => { e.currentTarget.style.boxShadow="0 0 50px rgba(109,40,217,0.7)"; e.currentTarget.style.transform="translateY(-1px)"; }} onMouseLeave={e => { e.currentTarget.style.boxShadow="0 0 30px rgba(109,40,217,0.45)"; e.currentTarget.style.transform="translateY(0)"; }}>
              Start free — no card needed
            </Link>
            <Link href="/demo" style={{ textDecoration: "none", padding: "13px 28px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", fontSize: "15px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", transition: "background 0.2s, transform 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.09)"; e.currentTarget.style.transform="translateY(-1px)"; }} onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.transform="translateY(0)"; }}>
              See it in action →
            </Link>
          </div>

          {/* count-up stats */}
          <div className="proof-strip" style={{ marginTop: "3rem", display: "flex", justifyContent: "center", gap: "2.5rem", flexWrap: "wrap" }}>
            {[
              { label: "messages sent", prefix: "", target: 50000, suffix: "+" },
              { label: "integrations", prefix: "", target: 20, suffix: "+" },
              { label: "agent workspace", prefix: "", target: 24, suffix: "/7" },
              { label: "to start", prefix: "$", target: 0, suffix: "" },
            ].map(({ label, prefix, target, suffix }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.5px" }}>
                  {prefix}<CountUp target={target} suffix={suffix} />
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS MARQUEE */}
      <Reveal>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "1.25rem 0", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "80px", background: "linear-gradient(to right, #08080f, transparent)", zIndex: 1, pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "80px", background: "linear-gradient(to left, #08080f, transparent)", zIndex: 1, pointerEvents: "none" }} />
          <div style={{ display: "flex", gap: "0", width: "max-content", animation: "marquee 30s linear infinite" }}>
            {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 2rem", fontSize: "12px", color: "rgba(255,255,255,0.28)", fontWeight: 500, letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(139,92,246,0.5)", display: "inline-block", flexShrink: 0 }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      {/* LIVE DEMO */}
      <section className="preview-section section-shell" style={{ padding: "4rem 1.5rem 5rem", maxWidth: "800px", margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>Live preview</div>
            <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: 0 }}>Watch Lyra work</h2>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div style={{ animation: "float 6s ease-in-out infinite" }}>
            <LiveDemo />
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "2rem 1.5rem 5rem", maxWidth: "1100px", margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>How it works</div>
            <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.75rem" }}>From idea to execution</h2>
            <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6 }}>Three steps. No setup. No prompting guide needed.</p>
          </div>
        </Reveal>
        <div className="how-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: "0", alignItems: "start" }}>
          {HOW_IT_WORKS.map((step, i) => (
            <React.Fragment key={step.num}>
              <Reveal delay={i * 120}>
                <div style={{ textAlign: "center", padding: "0 1rem" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(109,40,217,0.15)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 1rem", boxShadow: "0 0 24px rgba(109,40,217,0.15)" }}>
                    {step.icon}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(139,92,246,0.8)", letterSpacing: "1px", marginBottom: "6px" }}>{step.num}</div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "rgba(255,255,255,0.88)", marginBottom: "8px" }}>{step.title}</div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>{step.desc}</div>
                </div>
              </Reveal>
              {i < HOW_IT_WORKS.length - 1 && (
                <Reveal delay={i * 120 + 60} style={{ alignSelf: "start", paddingTop: "28px" }}>
                  <div className="step-line" style={{ display: "flex", alignItems: "center", padding: "0 0.5rem" }}>
                    <div style={{ height: "1px", width: "60px", background: "linear-gradient(to right, rgba(139,92,246,0.4), rgba(20,184,166,0.4))" }} />
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", margin: "0 4px" }}>→</span>
                  </div>
                </Reveal>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="feature-section section-shell" style={{ padding: "4rem 1.5rem 5rem", maxWidth: "1100px", margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>What makes Lyra different</div>
            <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.75rem" }}>Built to compound, not reset</h2>
            <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
              ChatGPT resets. Claude resets. Every session starts cold. Lyra doesn't — it compounds.
            </p>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1px", borderRadius: "16px", overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <FeatureCard f={f} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonial-section section-shell" style={{ padding: "3rem 1.5rem 5rem", maxWidth: "1100px", margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>Beta feedback</div>
            <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: 0 }}>What beta users say</h2>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {[
            { q: "Lyra remembered a conversation I had three weeks ago and used it to answer a question perfectly. No other AI has ever done that for me.", n: "Marcus R.", r: "Freelance consultant", i: "MR" },
            { q: "The email drafting alone saves me an hour a week. It actually sends things — it just does it.", n: "Jamie L.", r: "Startup founder", i: "JL" },
            { q: "I've tried every AI tool. Lyra is the first one that actually feels like it's learning. I can see it getting sharper every week.", n: "Tanya K.", r: "Product manager", i: "TK" },
          ].map((t, i) => (
            <Reveal key={t.n} delay={i * 80}>
              <div style={{ borderRadius: "14px", padding: "1.5rem", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", backdropFilter: "blur(10px)", height: "100%" }}>
                <div style={{ fontSize: "13px", color: "rgb(251,191,36)", marginBottom: "12px", letterSpacing: "2px" }}>★★★★★</div>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: "16px" }}>&ldquo;{t.q}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,rgba(109,40,217,0.4),rgba(20,184,166,0.4))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{t.i}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{t.n}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>{t.r}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing-section section-shell" style={{ padding: "3rem 1.5rem 5rem", maxWidth: "1100px", margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>Pricing</div>
            <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.5rem" }}>Simple, honest pricing</h2>
            <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.35)" }}>Start free. Upgrade when Lyra becomes indispensable.</p>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 80}>
              <div style={{
                borderRadius: "16px", padding: "1.75rem", position: "relative", height: "100%",
                border: p.accent ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.07)",
                background: p.accent ? "rgba(109,40,217,0.1)" : "rgba(255,255,255,0.025)",
                boxShadow: p.accent ? "0 0 40px rgba(109,40,217,0.2), inset 0 0 40px rgba(109,40,217,0.04)" : "none",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = p.accent ? "0 8px 50px rgba(109,40,217,0.35)" : "0 8px 30px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = p.accent ? "0 0 40px rgba(109,40,217,0.2), inset 0 0 40px rgba(109,40,217,0.04)" : "none"; }}
              >
                {p.accent && (
                  <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,rgb(109,40,217),rgb(134,25,143))", fontSize: "11px", fontWeight: 500, padding: "3px 14px", borderRadius: "100px", color: "#fff", whiteSpace: "nowrap" }}>Most popular</div>
                )}
                <div style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: "6px" }}>{p.name}</div>
                <div style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-1.5px", marginBottom: "4px" }}>
                  {p.price} <span style={{ fontSize: "14px", fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>{p.sub}</span>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", margin: "1.25rem 0" }} />
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {p.features.map(f => (
                    <li key={f} style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "rgb(94,234,212)", fontWeight: 600 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href} style={{
                  display: "block", textAlign: "center", textDecoration: "none",
                  padding: "11px", borderRadius: "9px", fontSize: "14px", fontWeight: 500, transition: "opacity 0.2s",
                  background: p.accent ? "linear-gradient(135deg,rgb(109,40,217),rgb(134,25,143))" : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  border: p.accent ? "none" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: p.accent ? "0 0 20px rgba(109,40,217,0.4)" : "none",
                }} onMouseEnter={e => (e.currentTarget.style.opacity="0.85")} onMouseLeave={e => (e.currentTarget.style.opacity="1")}>{p.cta}</Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "3rem 1.5rem 5rem", maxWidth: "760px", margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>FAQ</div>
            <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.5rem" }}>Common questions</h2>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section style={{ padding: "2rem 1.5rem 6rem", maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <div style={{ position: "relative", borderRadius: "24px", padding: "5rem 2rem", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(109,40,217,0.07)", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.2) 0%, transparent 65%)", pointerEvents: "none" }} />
            <h2 style={{ position: "relative", fontSize: "clamp(1.6rem,4vw,2.5rem)", fontWeight: 700, letterSpacing: "-1px", margin: "0 0 1rem" }}>
              Your AI gets smarter<br /><span style={{ color: "rgba(255,255,255,0.4)" }}>every day you use it</span>
            </h2>
            <p style={{ position: "relative", fontSize: "16px", color: "rgba(255,255,255,0.4)", marginBottom: "2rem" }}>
              Start free. No credit card. No time limit on the free tier.
            </p>
            <Link href="/login" style={{ position: "relative", display: "inline-block", textDecoration: "none", padding: "14px 32px", borderRadius: "10px", background: "linear-gradient(135deg,rgb(109,40,217),rgb(134,25,143))", color: "#fff", fontSize: "15px", fontWeight: 500, boxShadow: "0 0 40px rgba(109,40,217,0.5)", transition: "box-shadow 0.2s, transform 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 60px rgba(109,40,217,0.75)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 40px rgba(109,40,217,0.5)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Start building with Lyra →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", maxWidth: "1100px", margin: "0 auto", fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>
        <div>© 2026 AITaskFlo</div>
        <div className="footer-links" style={{ display: "flex", gap: "1.5rem" }}>
          {["Pricing","Privacy","Terms","Support"].map(l => (
            <Link key={l} href={`/${l.toLowerCase()}`} style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color="rgba(255,255,255,0.6)")} onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,0.25)")}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.78)", fontSize: "14px", fontWeight: 500, cursor: "pointer", textAlign: "left", gap: "1rem" }}
      >
        <span>{q}</span>
        <span style={{ fontSize: "20px", color: "rgba(139,92,246,0.8)", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0deg)", display: "inline-block" }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 1.5rem 1.25rem", fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>{a}</div>
      )}
    </div>
  );
}

// ── Feature card (extracted so hover state works cleanly) ─────────────────────

function FeatureCard({ f }: { f: typeof FEATURES[number] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="feature-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "1.75rem",
        background: hovered ? "rgba(109,40,217,0.07)" : "#08080f",
        boxShadow: hovered ? `0 0 30px ${f.glow}` : "none",
        height: "100%",
      }}
    >
      <div style={{
        width: "44px", height: "44px", borderRadius: "12px",
        background: hovered ? `radial-gradient(circle, ${f.glow.replace("0.2","0.3").replace("0.18","0.28").replace("0.22","0.3").replace("0.25","0.35")}, rgba(109,40,217,0.05))` : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "20px", marginBottom: "1rem",
        transition: "background 0.3s",
      }}>
        {f.icon}
      </div>
      <div style={{ fontSize: "15px", fontWeight: 500, marginBottom: "8px", color: "rgba(255,255,255,0.88)" }}>{f.title}</div>
      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>{f.desc}</div>
    </div>
  );
}
