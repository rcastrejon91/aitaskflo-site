"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
  { r: "lyra", t: "3 unread. Drafting reply to Marcus at Gradient Ventures — referencing your $350K GCP credit." },
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
      {/* chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
        {["#E24B4A","#EF9F27","#639922"].map(c => <div key={c} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c, opacity: 0.8 }} />)}
        <span style={{ marginLeft: "8px", fontSize: "11px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>aitaskflo.com/lyra</span>
      </div>
      {/* messages */}
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

// ── Page ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "🧠", title: "Persistent memory", desc: "Carries full context across every session. Your projects, preferences, patterns — no re-explaining." },
  { icon: "🔁", title: "Reflection engine", desc: "Reviews every conversation and refines how it responds to you. Gets sharper every week." },
  { icon: "⚡", title: "Real automation", desc: "Sends emails, searches the web, generates images, coordinates multi-step workflows." },
  { icon: "🎓", title: "Skill learning", desc: "Encounters something new? Lyra writes and saves a skill on the spot and remembers it forever." },
  { icon: "🌐", title: "Browser agent", desc: "Opens sites, clicks around, fills forms, extracts data — anything you can do in a browser." },
  { icon: "📈", title: "Agent evolution", desc: "Improves her own architecture over time. Every generation, every change — full transparency." },
];

const PLANS = [
  { name: "Free", price: "$0", sub: "forever", features: ["40 messages / day", "Persistent memory", "Image generation", "Web search"], cta: "Get started free", href: "/login", accent: false },
  { name: "Pro", price: "$29", sub: "/ month", features: ["Unlimited messages", "Full automation suite", "Google Drive + Calendar", "Agent evolution", "Image + video generation", "Browser agent"], cta: "Start Pro", href: "/login?plan=pro", accent: true },
  { name: "Business", price: "$49", sub: "/ month", features: ["Everything in Pro", "Multi-agent workflows", "Skill factory", "Admin analytics", "API access"], cta: "Get Business", href: "/login?plan=business", accent: false },
];

export default function HomePage() {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Helvetica Neue', sans-serif", background: "#08080f", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
        * { box-sizing: border-box; }
        a { color: inherit; }
        .site-nav { gap: 1rem; }
        .site-nav-links { min-width: 0; }
        .hero-copy { padding-top: 8rem; }
        .section-shell { scroll-margin-top: 88px; }
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
        }
      `}</style>

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
          <Link className="site-nav-link" href="/login" style={{ textDecoration: "none", padding: "7px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: "13px", transition: "border-color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.borderColor="rgba(255,255,255,0.3)")} onMouseLeave={e => (e.currentTarget.style.borderColor="rgba(255,255,255,0.12)")}>Sign in</Link>
          <Link className="site-nav-link" href="/login" style={{ textDecoration: "none", padding: "7px 16px", borderRadius: "8px", background: "linear-gradient(135deg,rgb(109,40,217),rgb(134,25,143))", color: "#fff", fontSize: "13px", fontWeight: 500, boxShadow: "0 0 20px rgba(109,40,217,0.4)" }}>Get started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Starfield />

        {/* Glow orbs */}
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(109,40,217,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "0", left: "10%", width: "500px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(20,184,166,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="hero-copy" style={{ position: "relative", textAlign: "center", padding: "8rem 1.5rem 4rem", maxWidth: "860px", margin: "0 auto" }}>
          {/* badge */}
          <div className="hero-eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 14px 5px 8px", borderRadius: "100px", border: "1px solid rgba(139,92,246,0.3)", background: "rgba(109,40,217,0.12)", fontSize: "12px", color: "rgba(196,181,253,0.9)", marginBottom: "2rem", backdropFilter: "blur(10px)" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgb(20,184,166)", boxShadow: "0 0 8px rgb(20,184,166)", display: "inline-block" }} />
            Persistent memory · Real automation · Agent evolution
          </div>

          <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4.2rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-2px", margin: "0 0 1.5rem" }}>
            The AI that builds a{" "}
            <span style={{ background: "linear-gradient(135deg, rgb(167,139,250), rgb(94,234,212))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>world around you</span>
          </h1>

          <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: "520px", margin: "0 auto 2.5rem" }}>
            Lyra remembers everything, learns from every conversation, and actually executes — emails, trades, research, code. Not just answers.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{ textDecoration: "none", padding: "13px 28px", borderRadius: "10px", background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", color: "#fff", fontSize: "15px", fontWeight: 500, boxShadow: "0 0 30px rgba(109,40,217,0.45)", transition: "box-shadow 0.2s" }} onMouseEnter={e => (e.currentTarget.style.boxShadow="0 0 50px rgba(109,40,217,0.7)")} onMouseLeave={e => (e.currentTarget.style.boxShadow="0 0 30px rgba(109,40,217,0.45)")}>
              Start free — no card needed
            </Link>
            <Link href="/demo" style={{ textDecoration: "none", padding: "13px 28px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", fontSize: "15px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,0.09)")} onMouseLeave={e => (e.currentTarget.style.background="rgba(255,255,255,0.05)")}>
              See it in action →
            </Link>
          </div>

          {/* social proof */}
          <div className="proof-strip" style={{ marginTop: "3rem", display: "flex", justifyContent: "center", gap: "2.5rem", flexWrap: "wrap" }}>
            {[["10,000+","messages sent"],["3","AI models"],["24/7","agent workspace"],["$0","to start"]].map(([n,l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.5px" }}>{n}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section className="preview-section section-shell" style={{ padding: "4rem 1.5rem 5rem", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>Live preview</div>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: 0 }}>Watch Lyra work</h2>
        </div>
        <div style={{ animation: "float 6s ease-in-out infinite" }}>
          <LiveDemo />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="feature-section section-shell" style={{ padding: "4rem 1.5rem 5rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>What makes Lyra different</div>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.75rem" }}>Built to compound, not reset</h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
            Every other AI forgets you the moment you close the tab. Lyra keeps building.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1px", borderRadius: "16px", overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ padding: "1.75rem", background: "#08080f", transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.background="rgba(109,40,217,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background="#08080f")}
            >
              <div style={{ fontSize: "22px", marginBottom: "1rem" }}>{f.icon}</div>
              <div style={{ fontSize: "15px", fontWeight: 500, marginBottom: "8px", color: "rgba(255,255,255,0.88)" }}>{f.title}</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonial-section section-shell" style={{ padding: "3rem 1.5rem 5rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>Early users</div>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: 0 }}>Real people, real results</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {[
            { q: "Lyra remembered a conversation I had three weeks ago and used it to answer a question perfectly. No other AI has ever done that for me.", n: "Marcus R.", r: "Freelance consultant", i: "MR" },
            { q: "The email drafting alone saves me an hour a week. It actually sends things — it just does it.", n: "Jamie L.", r: "Startup founder", i: "JL" },
            { q: "I've tried every AI tool. Lyra is the first one that actually feels like it's learning. I can see it getting sharper every week.", n: "Tanya K.", r: "Product manager", i: "TK" },
          ].map((t) => (
            <div key={t.n} style={{ borderRadius: "14px", padding: "1.5rem", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", backdropFilter: "blur(10px)" }}>
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
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing-section section-shell" style={{ padding: "3rem 1.5rem 5rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>Pricing</div>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.5rem" }}>Simple, honest pricing</h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.35)" }}>Start free. Upgrade when Lyra becomes indispensable.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {PLANS.map((p) => (
            <div key={p.name} style={{
              borderRadius: "16px", padding: "1.75rem", position: "relative",
              border: p.accent ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.07)",
              background: p.accent ? "rgba(109,40,217,0.1)" : "rgba(255,255,255,0.025)",
              boxShadow: p.accent ? "0 0 40px rgba(109,40,217,0.2), inset 0 0 40px rgba(109,40,217,0.04)" : "none",
            }}>
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
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "2rem 1.5rem 6rem", maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ position: "relative", borderRadius: "24px", padding: "5rem 2rem", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(109,40,217,0.07)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.2) 0%, transparent 65%)", pointerEvents: "none" }} />
          <h2 style={{ position: "relative", fontSize: "clamp(1.6rem,4vw,2.5rem)", fontWeight: 700, letterSpacing: "-1px", margin: "0 0 1rem" }}>
            Your AI gets smarter<br /><span style={{ color: "rgba(255,255,255,0.4)" }}>every day you use it</span>
          </h2>
          <p style={{ position: "relative", fontSize: "16px", color: "rgba(255,255,255,0.4)", marginBottom: "2rem" }}>
            Start free. No credit card. No time limit on the free tier.
          </p>
          <Link href="/login" style={{ position: "relative", display: "inline-block", textDecoration: "none", padding: "14px 32px", borderRadius: "10px", background: "linear-gradient(135deg,rgb(109,40,217),rgb(134,25,143))", color: "#fff", fontSize: "15px", fontWeight: 500, boxShadow: "0 0 40px rgba(109,40,217,0.5)" }}>
            Start building with Lyra →
          </Link>
        </div>
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
