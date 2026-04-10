"use client";

export default function HomePage() {
  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "var(--color-text, #0f0f0f)", background: "#fff", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 2rem", borderBottom: "1px solid #e8e8e8",
        position: "sticky", top: 0, background: "#fff", zIndex: 50,
      }}>
        <div style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.3px" }}>
          AITaskFlo <span style={{ opacity: 0.35 }}>/ Lyra</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "14px", color: "#666" }}>
          <a href="#features" style={{ textDecoration: "none", color: "inherit" }}>Features</a>
          <a href="#pricing" style={{ textDecoration: "none", color: "inherit" }}>Pricing</a>
          <a href="/demo" style={{ textDecoration: "none", color: "inherit" }}>Demo</a>
          <a href="/login" style={{
            textDecoration: "none", color: "#0f0f0f",
            border: "1px solid #ddd", borderRadius: "8px",
            padding: "7px 16px", fontSize: "13px"
          }}>Sign in</a>
          <a href="/login" style={{
            textDecoration: "none", background: "#0f0f0f", color: "#fff",
            borderRadius: "8px", padding: "8px 18px", fontSize: "13px", fontWeight: 500
          }}>Get started free</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: "center", padding: "5rem 1.5rem 3.5rem", maxWidth: "780px", margin: "0 auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "#f4f4f4", border: "1px solid #e8e8e8",
          borderRadius: "100px", padding: "5px 14px",
          fontSize: "12px", color: "#666", marginBottom: "2rem"
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} />
          Now with persistent memory and real automation
        </div>

        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.4rem)", fontWeight: 600,
          lineHeight: 1.12, letterSpacing: "-1.5px", margin: "0 0 1.25rem"
        }}>
          The AI that gets smarter{" "}
          <span style={{ opacity: 0.3 }}>every time you use it</span>
        </h1>

        <p style={{
          fontSize: "17px", color: "#666", lineHeight: 1.7,
          maxWidth: "540px", margin: "0 auto 2rem"
        }}>
          Lyra remembers your preferences, learns from every conversation, and actually does things —
          draft emails, research topics, run your workflows. Not just chat.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <a href="/login" style={{
            background: "#0f0f0f", color: "#fff", textDecoration: "none",
            borderRadius: "9px", padding: "12px 26px", fontSize: "15px", fontWeight: 500
          }}>
            Start free — no card needed
          </a>
          <a href="/demo" style={{
            background: "transparent", color: "#0f0f0f", textDecoration: "none",
            border: "1px solid #ddd", borderRadius: "9px",
            padding: "12px 26px", fontSize: "15px"
          }}>
            See Lyra in action
          </a>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div style={{
        borderTop: "1px solid #e8e8e8", borderBottom: "1px solid #e8e8e8",
        padding: "2rem 1.5rem", textAlign: "center", maxWidth: "1100px", margin: "0 auto"
      }}>
        <div style={{ fontSize: "11px", color: "#aaa", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          Trusted by builders and teams
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "3.5rem", flexWrap: "wrap" }}>
          {[
            { num: "10,000+", label: "Messages sent" },
            { num: "3", label: "AI models powering Lyra" },
            { num: "Unlimited", label: "Memory depth" },
            { num: "$0", label: "To get started" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.5px" }}>{s.num}</div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DEMO WINDOW */}
      <div style={{ padding: "4rem 1.5rem", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ border: "1px solid #e8e8e8", borderRadius: "14px", overflow: "hidden", background: "#fff" }}>
          {/* topbar */}
          <div style={{
            background: "#f8f8f8", borderBottom: "1px solid #e8e8e8",
            padding: "10px 16px", display: "flex", alignItems: "center", gap: "7px"
          }}>
            {["#E24B4A", "#EF9F27", "#639922"].map((c) => (
              <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
            ))}
            <span style={{ fontSize: "12px", color: "#aaa", marginLeft: "8px" }}>aitaskflo.com / lyra</span>
          </div>
          {/* body */}
          <div style={{ display: "flex", height: "340px" }}>
            {/* sidebar */}
            <div style={{ width: "190px", borderRight: "1px solid #e8e8e8", padding: "16px", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", color: "#aaa", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>Threads</div>
              {["Q2 planning doc", "Email follow-up", "Research: competitors", "Daily standup"].map((t, i) => (
                <div key={t} style={{
                  padding: "6px 10px", borderRadius: "7px", fontSize: "13px",
                  color: i === 0 ? "#0f0f0f" : "#888",
                  background: i === 0 ? "#f4f4f4" : "transparent",
                  marginBottom: "3px", cursor: "pointer"
                }}>{t}</div>
              ))}
            </div>
            {/* chat */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflow: "hidden" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", background: "#f4f4f4",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 500, flexShrink: 0, color: "#666"
                  }}>You</div>
                  <div style={{
                    background: "#f4f4f4", borderRadius: "10px", padding: "10px 14px",
                    fontSize: "13px", lineHeight: 1.55, maxWidth: "420px"
                  }}>
                    Draft a follow-up email to the investor from last week. Keep it short, reference the deck we discussed.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", background: "#E1F5EE",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 500, flexShrink: 0, color: "#0F6E56"
                  }}>L</div>
                  <div style={{
                    background: "#E1F5EE", borderRadius: "10px", padding: "10px 14px",
                    fontSize: "13px", lineHeight: 1.55, maxWidth: "420px", color: "#085041"
                  }}>
                    On it — pulling context from our last thread and your shared deck.
                    <div style={{
                      marginTop: "8px", padding: "6px 10px", background: "#fff",
                      border: "1px solid #9FE1CB", borderRadius: "7px",
                      fontSize: "12px", color: "#0F6E56", display: "inline-block"
                    }}>
                      Draft ready in Gmail · 3 edits suggested
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", background: "#f4f4f4",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 500, flexShrink: 0, color: "#666"
                  }}>You</div>
                  <div style={{
                    background: "#f4f4f4", borderRadius: "10px", padding: "10px 14px",
                    fontSize: "13px", lineHeight: 1.55, maxWidth: "420px"
                  }}>
                    Perfect. Also remind me what their main concern was.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", background: "#E1F5EE",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 500, flexShrink: 0, color: "#0F6E56"
                  }}>L</div>
                  <div style={{
                    background: "#E1F5EE", borderRadius: "10px", padding: "10px 14px",
                    fontSize: "13px", lineHeight: 1.55, maxWidth: "420px", color: "#085041"
                  }}>
                    They flagged go-to-market timeline as the main concern — specifically asking for 90-day milestones. I&apos;ve noted that in the draft.
                  </div>
                </div>
              </div>
              <div style={{
                borderTop: "1px solid #e8e8e8", padding: "12px 16px",
                display: "flex", alignItems: "center", gap: "10px"
              }}>
                <input
                  type="text" placeholder="Ask Lyra anything..."
                  readOnly
                  style={{
                    flex: 1, border: "none", background: "transparent",
                    fontSize: "13px", color: "#0f0f0f", outline: "none"
                  }}
                />
                <button style={{
                  background: "#0f0f0f", color: "#fff", border: "none",
                  borderRadius: "7px", padding: "7px 14px", fontSize: "13px",
                  fontWeight: 500, cursor: "pointer"
                }}>Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ padding: "3rem 1.5rem 4rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ fontSize: "11px", color: "#aaa", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "0.75rem" }}>How it works</div>
        <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.5rem" }}>Built different from day one</h2>
        <p style={{ fontSize: "16px", color: "#666", lineHeight: 1.65, maxWidth: "500px", marginBottom: "2.5rem" }}>
          Most AI tools reset after every conversation. Lyra compounds — it builds understanding of how you work and gets more precise over time.
        </p>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1px", border: "1px solid #e8e8e8", borderRadius: "14px", overflow: "hidden",
          background: "#e8e8e8"
        }}>
          {[
            { icon: "🧠", title: "Persistent memory", desc: "Lyra carries full context across every session — your projects, preferences, and patterns. No re-explaining. No starting over." },
            { icon: "🔁", title: "Reflection engine", desc: "After each conversation, Lyra reviews what worked and what didn't. Every session sharpens how it responds to you." },
            { icon: "⚡", title: "Real automation", desc: "Draft and send emails, search the web, generate images, browse websites, and coordinate complex workflows." },
            { icon: "🎓", title: "On-demand skill learning", desc: "When Lyra encounters something new, she writes and saves a skill for it on the spot — and remembers it forever." },
            { icon: "🌐", title: "Browser agent", desc: "Lyra can open websites, click around, fill forms, and extract data — anything you can do in a browser, she can do for you." },
            { icon: "📈", title: "Agent evolution", desc: "Lyra improves her own architecture over time. See every generation, every change, full transparency on what she learned." },
          ].map((f) => (
            <div key={f.title} style={{ background: "#fff", padding: "1.5rem" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                border: "1px solid #e8e8e8", display: "flex", alignItems: "center",
                justifyContent: "center", marginBottom: "1rem", fontSize: "16px"
              }}>{f.icon}</div>
              <div style={{ fontSize: "15px", fontWeight: 500, marginBottom: "6px" }}>{f.title}</div>
              <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "2rem 1.5rem 4rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ fontSize: "11px", color: "#aaa", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "0.75rem" }}>What users say</div>
        <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 2rem" }}>Real people, real results</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {[
            { quote: "Lyra remembered a conversation I had three weeks ago and used it to answer a question perfectly. No other AI has ever done that for me.", name: "Marcus R.", role: "Freelance consultant", initials: "MR" },
            { quote: "The email drafting alone saves me an hour a week. It actually sends things — it's not just a template. It just does it.", name: "Jamie L.", role: "Startup founder", initials: "JL" },
            { quote: "I've tried every AI tool. Lyra is the first one that actually feels like it's learning. I can see it getting sharper every week.", name: "Tanya K.", role: "Product manager", initials: "TK" },
          ].map((t) => (
            <div key={t.name} style={{
              border: "1px solid #e8e8e8", borderRadius: "14px",
              padding: "1.25rem", background: "#fff"
            }}>
              <div style={{ fontSize: "12px", color: "#BA7517", marginBottom: "10px", letterSpacing: "2px" }}>★★★★★</div>
              <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#444", marginBottom: "14px" }}>{t.quote}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%", background: "#f4f4f4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 500, color: "#666"
                }}>{t.initials}</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: "12px", color: "#aaa" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "2rem 1.5rem 4rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ fontSize: "11px", color: "#aaa", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "0.75rem" }}>Pricing</div>
        <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.5rem" }}>Simple, honest pricing</h2>
        <p style={{ fontSize: "16px", color: "#666", marginBottom: "2rem" }}>Start free. Upgrade when Lyra becomes indispensable.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {[
            {
              plan: "Free", price: "$0", period: "/ month", featured: false,
              desc: "Everything you need to see if Lyra clicks with how you work.",
              features: ["50 messages / month", "Persistent memory", "Gmail integration", "Conversation history"],
              cta: "Get started free", href: "/login"
            },
            {
              plan: "Pro", price: "$29", period: "/ month", featured: true,
              desc: "For people who want Lyra to handle the heavy lifting every day.",
              features: ["Unlimited messages", "Full automation suite", "Google Drive + Calendar", "Agent evolution + lineage", "Image + video generation", "Browser agent", "Priority support"],
              cta: "Start Pro — $29/mo", href: "/login?plan=pro"
            },
            {
              plan: "Business", price: "$49", period: "/ month", featured: false,
              desc: "For power users and small teams who need the full toolkit.",
              features: ["Everything in Pro", "Multi-agent workflows", "On-demand skill learning", "Admin analytics", "API access", "Custom integrations"],
              cta: "Get Business", href: "/login?plan=business"
            },
          ].map((p) => (
            <div key={p.plan} style={{
              border: p.featured ? "2px solid #0f0f0f" : "1px solid #e8e8e8",
              borderRadius: "14px", padding: "1.5rem", background: "#fff",
              position: "relative"
            }}>
              {p.featured && (
                <div style={{
                  position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
                  background: "#0f0f0f", color: "#fff", fontSize: "11px", fontWeight: 500,
                  padding: "3px 12px", borderRadius: "100px"
                }}>Most popular</div>
              )}
              <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}>{p.plan}</div>
              <div style={{ fontSize: "30px", fontWeight: 600, letterSpacing: "-1px", marginBottom: "4px" }}>
                {p.price} <span style={{ fontSize: "14px", fontWeight: 400, color: "#888" }}>{p.period}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#666", marginBottom: "1.25rem", lineHeight: 1.55 }}>{p.desc}</div>
              <hr style={{ border: "none", borderTop: "1px solid #e8e8e8", marginBottom: "1.25rem" }} />
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.25rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                {p.features.map((f) => (
                  <li key={f} style={{ fontSize: "13px", color: "#555", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#1D9E75" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href={p.href} style={{
                display: "block", textAlign: "center", textDecoration: "none",
                padding: "10px", borderRadius: "8px", fontSize: "14px", fontWeight: 500,
                background: p.featured ? "#0f0f0f" : "transparent",
                color: p.featured ? "#fff" : "#0f0f0f",
                border: p.featured ? "none" : "1px solid #ddd"
              }}>{p.cta}</a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        margin: "0 auto 4rem", maxWidth: "1060px", padding: "0 1.5rem"
      }}>
        <div style={{
          border: "1px solid #e8e8e8", borderRadius: "16px",
          padding: "4rem 2rem", textAlign: "center", background: "#f8f8f8"
        }}>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 0.75rem" }}>
            Your AI gets better every day you use it
          </h2>
          <p style={{ fontSize: "16px", color: "#666", marginBottom: "1.75rem" }}>
            Start for free. No credit card. No time limit on the free tier.
          </p>
          <a href="/login" style={{
            background: "#0f0f0f", color: "#fff", textDecoration: "none",
            borderRadius: "9px", padding: "13px 28px", fontSize: "15px", fontWeight: 500
          }}>
            Start building with Lyra
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #e8e8e8", padding: "1.5rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "12px", maxWidth: "1100px", margin: "0 auto",
        fontSize: "13px", color: "#aaa"
      }}>
        <div>© 2026 AITaskFlo</div>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          {["Pricing", "Privacy", "Terms", "Support"].map((l) => (
            <a key={l} href={`/${l.toLowerCase()}`} style={{ textDecoration: "none", color: "inherit" }}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  );
}
