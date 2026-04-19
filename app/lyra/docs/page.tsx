import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, Search, Shield, Phone, Zap, Globe, Music, Briefcase, TrendingUp, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Lyra — What Can I Do? | AITaskFlo",
  description: "Everything Lyra can do for you — search, research, security, media, local, jobs, and more.",
};

const sections = [
  {
    icon: "🔍",
    title: "Web Search",
    description: "Just ask Lyra to search for anything. She'll pull live results and summarize them for you.",
    examples: [
      "Search for the latest news on AI regulations",
      "Look up how to fix a Next.js hydration error",
      "Find me recent articles about SpaceX",
    ],
  },
  {
    icon: "📰",
    title: "News & Headlines",
    description: "Get the latest breaking news, topic headlines, or trending stories — updated in real time.",
    examples: [
      "What's happening in the news today?",
      "Get me the latest headlines about crypto",
      "What's trending right now?",
    ],
  },
  {
    icon: "📺",
    title: "YouTube",
    description: "Search YouTube for videos, channels, or trending content without leaving the chat.",
    examples: [
      "Find me YouTube videos on Next.js tutorial",
      "What's trending on YouTube today?",
      "Search YouTube for lofi study music",
    ],
  },
  {
    icon: "🎵",
    title: "Spotify & Music",
    description: "Search Spotify for songs, artists, and albums. Discover what's trending in music.",
    examples: [
      "Search Spotify for Bad Bunny",
      "Find the song Flowers by Miley Cyrus on Spotify",
      "What are the trending tracks on Spotify?",
    ],
  },
  {
    icon: "🎬",
    title: "Movies & TV Shows",
    description: "Look up movies and TV series — ratings, plot, cast, and trending titles from IMDB data.",
    examples: [
      "Find movie Inception details",
      "What are the trending movies right now?",
      "Search for the TV show Succession",
    ],
  },
  {
    icon: "🛒",
    title: "Amazon Product Search",
    description: "Search Amazon for products and get live listings with prices and ratings.",
    examples: [
      "Search Amazon for noise-cancelling headphones",
      "Find me ergonomic office chairs on Amazon",
      "Look up MacBook Pro accessories on Amazon",
    ],
  },
  {
    icon: "💱",
    title: "Currency & Exchange Rates",
    description: "Convert between any two currencies or get a full rate table — always live data.",
    examples: [
      "Convert 500 USD to EUR",
      "What's the exchange rate for MXN to USD?",
      "Show me exchange rates for GBP",
    ],
  },
  {
    icon: "📍",
    title: "Local Business Search",
    description: "Find restaurants, gyms, cafés, hotels, and other local businesses near any location.",
    examples: [
      "Find coffee shops near downtown Chicago",
      "Look for gyms in Miami",
      "Find a dentist near Houston TX",
    ],
  },
  {
    icon: "💼",
    title: "Job Search",
    description: "Search live job listings by title, keywords, and location across major job boards.",
    examples: [
      "Find remote software engineer jobs",
      "Search for marketing manager roles in Austin",
      "Look for entry-level data analyst positions",
    ],
  },
  {
    icon: "📱",
    title: "Instagram",
    description: "Look up Instagram profiles, recent posts, and hashtag feeds — no account needed.",
    examples: [
      "Show me the Instagram profile for natgeo",
      "Get recent posts from @nasa on Instagram",
      "Search Instagram hashtag #sunset",
    ],
  },
  {
    icon: "🤖",
    title: "Reddit",
    description: "Search Reddit posts or browse hot threads from any subreddit.",
    examples: [
      "Search Reddit for best mechanical keyboards",
      "Show me hot posts from r/programming",
      "Find Reddit discussions about React performance",
    ],
  },
  {
    icon: "🛡️",
    title: "Security Tools",
    description: "Run security checks, look up CVEs, scan URLs/IPs for threats, and analyze domains.",
    plan: "clients",
    examples: [
      "Check if this IP 8.8.8.8 has a bad reputation",
      "Look up CVE-2024-1234",
      "Scan this domain example.com for threats",
      "Run a VirusTotal scan on this URL",
    ],
  },
  {
    icon: "📞",
    title: "Phone Forensics",
    description: "Full phone number investigation — carrier, line type, spam/fraud score, breach data, and reverse owner lookup.",
    plan: "clients",
    examples: [
      "Run a forensics lookup on +13125551234",
      "Check the reputation of this phone number",
      "Who owns the phone number 3125551234?",
      "Validate this phone number format",
    ],
  },
];

export default function LyraClientDocsPage() {
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
            <Link href="/lyra" className="text-sm text-white/50 hover:text-white/80 transition-colors">Open Lyra</Link>
            <Link href="/pricing" className="text-sm px-4 py-1.5 rounded-full text-white font-medium" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>Upgrade</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
            <Sparkles className="w-3 h-3" /> Lyra Capabilities Guide
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Everything Lyra can do for you</h1>
          <p className="text-lg text-white/50 max-w-2xl">
            Lyra is your AI that actually does things — not just answers questions. Ask naturally and she'll use the right tool automatically.
          </p>
        </div>

        <div className="grid gap-5">
          {sections.map((s) => (
            <div key={s.title} className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <h2 className="text-lg font-semibold text-white">{s.title}</h2>
                </div>
                {s.plan === "clients" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}>
                    <Lock className="w-3 h-3" /> Clients only
                  </span>
                )}
              </div>
              <p className="text-white/50 text-sm mb-4">{s.description}</p>
              <div className="space-y-2">
                {s.examples.map((ex) => (
                  <div key={ex} className="flex items-center gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                    <span className="text-violet-400/60">→</span>
                    <span className="italic">&ldquo;{ex}&rdquo;</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.1))", border: "1px solid rgba(124,58,237,0.25)" }}>
          <h3 className="text-2xl font-bold text-white mb-2">Ready to get started?</h3>
          <p className="text-white/50 mb-6">Upgrade to a client plan to unlock security tools, phone forensics, and priority access.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/lyra" className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              Open Lyra
            </Link>
            <Link href="/pricing" className="px-6 py-2.5 rounded-xl text-white/70 font-semibold text-sm" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              View Plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
