import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Lyra Technical Documentation | AITaskFlo",
  description: "Official technical documentation for the Lyra AI platform — tools, architecture, access control, and integration.",
};

export default function LyraTechDocsPage() {
  return (
    <div className="min-h-screen text-white" style={{ background: "#080810" }}>
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl" style={{ background: "rgba(8,8,16,0.85)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">AITaskFlo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/lyra/docs" className="text-sm text-white/50 hover:text-white/80 transition-colors">Client Guide</Link>
            <Link href="/lyra" className="text-sm text-white/50 hover:text-white/80 transition-colors">Open Lyra</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
            <Sparkles className="w-3 h-3" /> Official Documentation
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Lyra Platform — Technical Docs</h1>
          <p className="text-white/45 text-sm">Version 2.0 · Last updated April 2026 · AITaskFlo</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-10" style={{ color: "rgba(255,255,255,0.55)" }}>

          {/* Overview */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Overview</h2>
            <p>Lyra is AITaskFlo's flagship conversational AI — a tool-augmented assistant built on Groq (Llama 3.3 70B) with real-time access to 18+ specialized tool integrations. Unlike standard chatbots, Lyra does not rely on static training data for information retrieval: when a user asks for news, product prices, exchange rates, or security intelligence, Lyra calls live APIs and returns structured, up-to-date results.</p>
            <p className="mt-3">Lyra runs as a Next.js 16 app deployed on DigitalOcean, managed by PM2, with a SQLite persistence layer for user memories, reflections, and subscription state.</p>
          </section>

          {/* Architecture */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Architecture</h2>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <table className="w-full text-sm">
                <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-white/70 font-medium">Component</th>
                    <th className="text-left px-4 py-2.5 text-white/70 font-medium">Technology</th>
                    <th className="text-left px-4 py-2.5 text-white/70 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["LLM", "Groq — Llama 3.3 70B", "Primary reasoning and response generation"],
                    ["Framework", "Next.js 16 (App Router)", "Full-stack web framework"],
                    ["Auth", "NextAuth.js v5 beta", "Session management, Google/GitHub OAuth"],
                    ["Database", "SQLite (better-sqlite3)", "Users, memories, reflections, subscriptions"],
                    ["Payments", "Stripe", "Subscription billing and webhook handling"],
                    ["Tool APIs", "RapidAPI + direct APIs", "18+ real-time data integrations"],
                    ["Process", "PM2", "Zero-downtime restarts on DigitalOcean"],
                  ].map(([c, t, p]) => (
                    <tr key={c} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="px-4 py-2.5 text-white/80 font-medium">{c}</td>
                      <td className="px-4 py-2.5 text-violet-300/70 font-mono text-xs">{t}</td>
                      <td className="px-4 py-2.5">{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tool Catalog */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Tool Catalog</h2>
            <p className="mb-5">Tools are defined in <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">lib/lyra/tools.ts</code> and handled in <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">lib/lyra/execute-tool.ts</code>. The LLM selects tools via Groq's function-calling API. Intent detection in <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">app/api/lyra/chat/route.ts</code> also injects CRITICAL override directives for high-confidence matches, ensuring specific tools fire reliably.</p>

            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <table className="w-full text-sm">
                <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-white/70 font-medium">Tool</th>
                    <th className="text-left px-4 py-2.5 text-white/70 font-medium">API Source</th>
                    <th className="text-left px-4 py-2.5 text-white/70 font-medium">Access</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["search_web", "Google Search (SerpAPI)", "All"],
                    ["news_search", "Real-Time News (RapidAPI)", "All"],
                    ["youtube_search", "YouTube Search (RapidAPI)", "All"],
                    ["spotify_search", "Spotify (RapidAPI)", "All"],
                    ["movie_search", "Movie Database (RapidAPI)", "All"],
                    ["amazon_search", "Amazon Search (RapidAPI)", "All"],
                    ["currency_convert", "Exchange Rate (RapidAPI)", "All"],
                    ["local_business_search", "Local Business (RapidAPI)", "All"],
                    ["job_search", "Job Search (RapidAPI)", "All"],
                    ["instagram_search", "Instagram (RapidAPI)", "All"],
                    ["reddit_search", "Reddit (RapidAPI)", "All"],
                    ["site_audit", "Internal / SpiderFoot", "All"],
                    ["security_scan", "Security (RapidAPI)", "Clients + Admins"],
                    ["cve_lookup", "CVE / NVD (RapidAPI)", "Clients + Admins"],
                    ["virustotal_scan", "VirusTotal (RapidAPI)", "Clients + Admins"],
                    ["ip_reputation", "IP Intelligence (RapidAPI)", "Clients + Admins"],
                    ["domain_intel", "Domain WHOIS/DNS (RapidAPI)", "Clients + Admins"],
                    ["phone_forensics", "Veriphone + RapidAPI", "Clients + Admins"],
                    ["mythos_scan", "Anthropic Project Glasswing*", "Admins only"],
                    ["generate_image", "Cloudflare AI / Flux", "All"],
                    ["create_gif", "Giphy API", "All"],
                    ["memory_add / memory_list", "SQLite (internal)", "Per-user"],
                    ["code_execute", "Internal sandbox", "All"],
                  ].map(([tool, api, access]) => (
                    <tr key={tool} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="px-4 py-2.5 font-mono text-violet-300/80 text-xs">{tool}</td>
                      <td className="px-4 py-2.5 text-white/50 text-xs">{api}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${access === "All" ? "text-emerald-400/80 bg-emerald-500/10" : access.includes("Admins only") ? "text-red-400/80 bg-red-500/10" : "text-amber-400/80 bg-amber-500/10"}`}>
                          {access}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-3 text-white/30">* mythos_scan activates automatically when MYTHOS_API_KEY environment variable is set. Currently a stub pending Anthropic Project Glasswing API access.</p>
          </section>

          {/* Access Control */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Access Control</h2>
            <p className="mb-4">Lyra enforces two access tiers at the tool handler level in <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">execute-tool.ts</code>:</p>
            <div className="space-y-3">
              {[
                { label: "Admin", badge: "bg-red-500/10 text-red-400/80", rule: 'userId.startsWith("admin-") || ADMIN_IDS.includes(userId)', desc: "Full access to all tools including mythos_scan. Admin IDs are hardcoded in route.ts." },
                { label: "Paid Client", badge: "bg-amber-500/10 text-amber-400/80", rule: 'getSubscription(userId).plan !== "free"', desc: "Access to security suite and phone_forensics tools. Requires active Stripe subscription." },
                { label: "Free / Public", badge: "bg-emerald-500/10 text-emerald-400/80", rule: "default", desc: "Access to all general-purpose tools: search, media, local, jobs, currency, Reddit, Instagram." },
              ].map((t) => (
                <div key={t.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.badge}`}>{t.label}</span>
                    <code className="text-violet-300/70 text-xs bg-white/5 px-1.5 py-0.5 rounded">{t.rule}</code>
                  </div>
                  <p className="text-sm text-white/45">{t.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Memory System */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Memory & Reflection System</h2>
            <p>Lyra maintains persistent per-user memory via SQLite. Memories are injected into the system prompt at the start of each conversation, allowing Lyra to recall user context, preferences, and prior interactions.</p>
            <p className="mt-3">Reflections are self-evaluations Lyra stores after interactions — they include a performance score and notes on what went well or poorly. These feed back into Lyra's behavior over time. The admin dashboard exposes full memory and reflection history.</p>
            <p className="mt-3">Memory functions: <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">getAllMemories(userId)</code>, <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">addMemory(userId, content)</code>, <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">deleteMemory(id)</code> — all in <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">lib/lyra/memories.ts</code>.</p>
          </section>

          {/* Intent Routing */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Intent Detection & Tool Routing</h2>
            <p>The chat route uses two layers to ensure the right tool fires:</p>
            <ol className="list-decimal list-inside space-y-2 mt-3 text-sm">
              <li><strong className="text-white/80">LLM function calling</strong> — Groq selects from the tool definitions based on the user message and system prompt.</li>
              <li><strong className="text-white/80">Intent detection overrides</strong> — Regex-based intent flags (e.g., <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">wantsNews</code>, <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">wantsYoutube</code>) inject CRITICAL directive text into the system prompt when a high-confidence match is detected, instructing the LLM to call the specific tool immediately and avoid fallback to <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">search_web</code>.</li>
            </ol>
            <p className="mt-3">The search policy (injected in every request) instructs Lyra to prefer specific tools over <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">search_web</code> and to fall back to web search only when no specific tool applies.</p>
          </section>

          {/* Env Vars */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Environment Variables</h2>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <table className="w-full text-sm">
                <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-white/70 font-medium">Variable</th>
                    <th className="text-left px-4 py-2.5 text-white/70 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["GROQ_API_KEY", "Llama 3.3 70B inference via Groq"],
                    ["RAPIDAPI_KEY", "All RapidAPI tool integrations (18+ tools)"],
                    ["SERPAPI_KEY", "Google web search via SerpAPI"],
                    ["OPENAI_API_KEY", "Fallback / image generation"],
                    ["CLOUDFLARE_AI_TOKEN", "Image generation via Cloudflare Workers AI"],
                    ["STRIPE_SECRET_KEY", "Payment processing"],
                    ["STRIPE_WEBHOOK_SECRET", "Stripe webhook verification"],
                    ["NEXTAUTH_SECRET", "Session encryption"],
                    ["AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET", "Google OAuth"],
                    ["MYTHOS_API_KEY", "Anthropic Project Glasswing (stub — not yet active)"],
                  ].map(([v, p]) => (
                    <tr key={v} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="px-4 py-2.5 font-mono text-violet-300/80 text-xs">{v}</td>
                      <td className="px-4 py-2.5 text-white/50 text-xs">{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Deployment */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Deployment</h2>
            <p>Lyra runs on a DigitalOcean droplet (<code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">159.203.73.230</code>) under PM2. The build process uses <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">npm run build</code> with TypeScript errors ignored (<code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">ignoreBuildErrors: true</code>) and 2GB swap to prevent OOM on the 2GB droplet. Builds run in the background with <code className="text-violet-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">nohup</code> due to SSH timeout limitations.</p>
            <div className="mt-4 rounded-xl p-4 font-mono text-xs text-white/60" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-white/30 mb-2"># Standard deploy flow</div>
              <div>rm -f .next/BUILD_ID</div>
              <div>nohup bash -c &apos;npm run build &gt; /tmp/build.log 2&gt;&amp;1; echo EXIT:$? &gt;&gt; /tmp/build.log&apos; &amp;</div>
              <div>tail -f /tmp/build.log</div>
              <div>pm2 restart aitaskflo</div>
            </div>
          </section>

          {/* Roadmap */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">Roadmap</h2>
            <div className="space-y-2">
              {[
                { status: "done", item: "18-tool RapidAPI integration suite" },
                { status: "done", item: "Phone forensics (restricted to clients)" },
                { status: "done", item: "Security suite (CVE, VirusTotal, IP reputation, domain intel)" },
                { status: "done", item: "Persistent per-user memory + reflections" },
                { status: "done", item: "Stripe billing integration" },
                { status: "planned", item: "Anthropic Project Glasswing (mythos_scan) — pending API access" },
                { status: "planned", item: "Offensive security tools (Metasploit, Nuclei, Shodan) — admin + verified clients" },
                { status: "planned", item: "Smart home integration (Raspberry Pi 5 hub, drone control, hologram display)" },
                { status: "planned", item: "Lyra voice interface" },
                { status: "planned", item: "Multi-agent task orchestration (Lyra spawns sub-agents)" },
              ].map((r) => (
                <div key={r.item} className="flex items-center gap-3 text-sm">
                  <span className={r.status === "done" ? "text-emerald-400" : "text-white/25"}>
                    {r.status === "done" ? "✓" : "○"}
                  </span>
                  <span style={{ color: r.status === "done" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)" }}>{r.item}</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
