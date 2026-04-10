"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const TruckerChat = dynamic(() => import("@/components/trucker/TruckerChat"), { ssr: false });

const FEATURES = [
  {
    icon: "🕐",
    title: "HOS Tracking",
    desc: "Real-time hours of service. Know exactly how many hours you have left.",
    demo: [
      { label: "I'm driving now", msg: "Log that I'm driving now" },
      { label: "Going off duty", msg: "Log that I'm off duty" },
      { label: "30 min break", msg: "Log that I'm taking a 30-minute break" },
      { label: "How many hours left?", msg: "What's my HOS status? How many hours do I have left?" },
    ],
  },
  {
    icon: "📦",
    title: "Load Board",
    desc: "Find available freight loads by origin, destination, and equipment type.",
    demo: [
      { label: "Find loads from Chicago", msg: "Find me loads going out of Chicago, IL" },
      { label: "Flatbed loads", msg: "Find flatbed loads from Dallas, TX" },
      { label: "Best paying loads", msg: "What loads are available near me with the best pay?" },
      { label: "Reefer loads", msg: "Find reefer loads from Atlanta, GA to Miami, FL" },
    ],
  },
  {
    icon: "🔧",
    title: "Engine Diagnostics",
    desc: "Live OBD-II data — RPM, temperature, fuel level, and fault codes.",
    demo: [
      { label: "Check engine data", msg: "Show me my OBD engine data" },
      { label: "Read fault codes", msg: "Read my engine fault codes" },
      { label: "Fuel level", msg: "What's my current fuel level and engine temp?" },
      { label: "Clear fault codes", msg: "Clear my engine fault codes" },
    ],
  },
  {
    icon: "🤖",
    title: "ADAS / openpilot",
    desc: "Real-time driver assist telemetry. Speed, engagement status, alerts.",
    demo: [
      { label: "Is openpilot on?", msg: "What's the openpilot status? Is it engaged?" },
      { label: "Lead vehicle distance", msg: "How far is the vehicle in front of me?" },
      { label: "Driver monitoring", msg: "Show me driver monitoring status" },
      { label: "Active alerts", msg: "Are there any ADAS alerts active right now?" },
    ],
  },
  {
    icon: "🌦️",
    title: "Route Weather",
    desc: "Weather conditions anywhere along your route, before you hit the road.",
    demo: [
      { label: "Weather in Denver", msg: "What's the weather in Denver, CO right now?" },
      { label: "Storm alerts", msg: "Any severe weather on I-80 through Wyoming?" },
      { label: "Wind conditions", msg: "What are wind conditions on I-90 through Montana?" },
      { label: "Road conditions", msg: "Check road conditions from Chicago to Indianapolis" },
    ],
  },
  {
    icon: "⛽",
    title: "Fuel & Stops",
    desc: "Find truck stops, fuel prices, and rest areas along your route.",
    demo: [
      { label: "Cheap diesel nearby", msg: "Find the cheapest diesel near me" },
      { label: "Truck stops on I-80", msg: "What truck stops are on I-80 between Chicago and Des Moines?" },
      { label: "Rest areas ahead", msg: "Find rest areas in the next 100 miles on I-40" },
      { label: "Loves or Pilot nearby", msg: "Find the nearest Loves or Pilot truck stop" },
    ],
  },
  {
    icon: "📋",
    title: "DOT & Compliance",
    desc: "Inspection prep, FMCSA rules, violation checklists — stay compliant.",
    demo: [
      { label: "Pre-trip checklist", msg: "Give me a DOT pre-trip inspection checklist" },
      { label: "Common violations", msg: "What are the most common DOT violations to watch for?" },
      { label: "Hours rules", msg: "Explain the 11-hour driving rule and 14-hour window" },
      { label: "Weight limits", msg: "What are the federal weight limits for an 18-wheeler?" },
    ],
  },
  {
    icon: "💰",
    title: "Broker Lookup",
    desc: "Check if a broker is legit — credit score, days to pay, reviews.",
    demo: [
      { label: "Is this broker legit?", msg: "How do I check if a freight broker is legit before hauling for them?" },
      { label: "Days to pay", msg: "What should I look for in a broker's payment terms?" },
      { label: "Quick pay options", msg: "What brokers offer quick pay or same day pay?" },
      { label: "Avoid scams", msg: "How do I spot freight broker scams?" },
    ],
  },
  {
    icon: "🛸",
    title: "Lost? Lyra's Got You",
    desc: "Alien, trucker, or just confused — Lyra helps anyone get where they're going.",
    demo: [
      { label: "I need to get home", msg: "I'm lost and need directions home, can you help?" },
      { label: "Best route to area 51", msg: "What's the best truck route to Nevada?" },
      { label: "Nearest landing zone", msg: "Find me the nearest open field in Nevada" },
      { label: "Phone home", msg: "How do I make a long distance call from the road?" },
    ],
  },
];

export default function TruckerClientPage() {
  const [launched, setLaunched] = useState(false);
  const [firstMsg, setFirstMsg] = useState("");
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const launch = (msg = "") => {
    setFirstMsg(msg);
    setLaunched(true);
  };

  if (launched) return <TruckerChat initialMessage={firstMsg} />;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center px-6 pt-16 pb-12 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-teal-500/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[200px] bg-cyan-500/8 rounded-full blur-[100px]" />
        </div>

        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-black text-black text-lg">
            A
          </div>
          <span className="text-white font-bold text-lg tracking-tight">AITaskFlo</span>
          <span className="text-white/30 text-sm">× Lyra AI</span>
        </div>

        {/* Truck SVG */}
        <div className="z-10 mb-8">
          <svg viewBox="0 0 520 200" className="w-[340px] md:w-[500px] drop-shadow-2xl" fill="none">
            <rect x="10" y="60" width="320" height="110" rx="8" fill="#1a2a2a" stroke="#14b8a6" strokeWidth="1.5"/>
            <rect x="20" y="70" width="300" height="90" rx="4" fill="#0d1f1f"/>
            <text x="170" y="118" textAnchor="middle" fill="#14b8a6" fontSize="22" fontWeight="bold" fontFamily="monospace">AITaskFlo</text>
            <text x="170" y="140" textAnchor="middle" fill="#5eead4" fontSize="11" fontFamily="monospace" opacity="0.7">POWERED BY LYRA AI</text>
            <circle cx="80" cy="172" r="18" fill="#111" stroke="#14b8a6" strokeWidth="2"/>
            <circle cx="80" cy="172" r="9" fill="#1a2a2a" stroke="#14b8a6" strokeWidth="1"/>
            <circle cx="130" cy="172" r="18" fill="#111" stroke="#14b8a6" strokeWidth="2"/>
            <circle cx="130" cy="172" r="9" fill="#1a2a2a" stroke="#14b8a6" strokeWidth="1"/>
            <rect x="330" y="80" width="140" height="90" rx="10" fill="#162424" stroke="#14b8a6" strokeWidth="1.5"/>
            <path d="M340 80 Q350 45 420 45 L465 80Z" fill="#1a2f2f" stroke="#14b8a6" strokeWidth="1.5"/>
            <path d="M348 78 Q355 52 418 52 L458 78Z" fill="#0d3333" stroke="#22d3ee" strokeWidth="1" opacity="0.8"/>
            <path d="M360 60 Q370 52 395 53" stroke="#67e8f9" strokeWidth="1" opacity="0.4"/>
            <rect x="338" y="95" width="50" height="35" rx="4" fill="#0d2e2e" stroke="#22d3ee" strokeWidth="1" opacity="0.7"/>
            <rect x="455" y="30" width="8" height="52" rx="3" fill="#14b8a6" opacity="0.6"/>
            <rect x="468" y="35" width="8" height="47" rx="3" fill="#14b8a6" opacity="0.4"/>
            <circle cx="459" cy="25" r="5" fill="#14b8a6" opacity="0.15"/>
            <circle cx="462" cy="18" r="7" fill="#14b8a6" opacity="0.1"/>
            <circle cx="472" cy="30" r="4" fill="#14b8a6" opacity="0.12"/>
            <circle cx="370" cy="172" r="18" fill="#111" stroke="#14b8a6" strokeWidth="2"/>
            <circle cx="370" cy="172" r="9" fill="#1a2a2a" stroke="#14b8a6" strokeWidth="1"/>
            <circle cx="450" cy="172" r="18" fill="#111" stroke="#14b8a6" strokeWidth="2"/>
            <circle cx="450" cy="172" r="9" fill="#1a2a2a" stroke="#14b8a6" strokeWidth="1"/>
            <rect x="466" y="110" width="12" height="8" rx="2" fill="#fef08a" opacity="0.9"/>
            <rect x="466" y="122" width="12" height="5" rx="1" fill="#fde68a" opacity="0.6"/>
            <line x1="0" y1="190" x2="520" y2="190" stroke="#14b8a6" strokeWidth="0.5" opacity="0.3"/>
            <rect x="50" y="188" width="40" height="2" rx="1" fill="#14b8a6" opacity="0.15"/>
            <rect x="140" y="188" width="40" height="2" rx="1" fill="#14b8a6" opacity="0.15"/>
            <rect x="230" y="188" width="40" height="2" rx="1" fill="#14b8a6" opacity="0.15"/>
            <rect x="320" y="188" width="40" height="2" rx="1" fill="#14b8a6" opacity="0.15"/>
            <rect x="420" y="188" width="40" height="2" rx="1" fill="#14b8a6" opacity="0.15"/>
          </svg>
        </div>

        <h1 className="z-10 text-4xl md:text-6xl font-black text-center tracking-tight mb-4">
          <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-400 bg-clip-text text-transparent">LYRA</span>
          <span className="text-white"> for Truckers</span>
        </h1>
        <p className="z-10 text-white/50 text-center text-lg max-w-xl mb-10 leading-relaxed">
          Your AI co-pilot on the road. HOS, loads, engine data, weather and more — just talk to her. Works for truckers, travelers, and the occasional alien trying to get home.
        </p>

        <button
          onClick={() => launch()}
          className="z-10 px-10 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-black font-black text-lg rounded-2xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 active:scale-95"
        >
          Launch Co-Pilot
        </button>
        <p className="z-10 text-white/20 text-xs mt-4">Free · No setup · Works on mobile</p>
      </div>

      {/* Tools Section */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-center text-white/40 text-sm font-semibold uppercase tracking-widest mb-2">
          Everything Lyra can do
        </h2>
        <p className="text-center text-white/25 text-xs mb-10">Click any tool to see what you can ask — then tap a question to launch it</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`border rounded-2xl p-5 cursor-pointer transition-all ${
                activeFeature === i
                  ? "border-teal-500/60 bg-teal-500/8"
                  : "border-white/8 bg-white/3 hover:border-teal-500/30 hover:bg-white/5"
              }`}
              onClick={() => setActiveFeature(activeFeature === i ? null : i)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{f.icon}</div>
                <span className={`text-xs transition-transform ${activeFeature === i ? "rotate-180" : ""} text-white/30`}>▼</span>
              </div>
              <h3 className="text-white font-bold mb-1">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-3">{f.desc}</p>

              {/* Demo buttons — show when expanded */}
              {activeFeature === i && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  <p className="text-teal-400/70 text-xs font-medium mb-2">Try asking Lyra:</p>
                  {f.demo.map((d) => (
                    <button
                      key={d.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        launch(d.msg);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-teal-500/15 border border-white/8 hover:border-teal-500/40 text-white/70 hover:text-teal-300 text-xs transition-all"
                    >
                      → {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14">
          <p className="text-white/30 text-sm mb-4">Ready to roll?</p>
          <button
            onClick={() => launch()}
            className="px-8 py-3 border border-teal-500/40 text-teal-400 font-semibold rounded-xl hover:bg-teal-500/10 transition-all text-sm"
          >
            Open Lyra Co-Pilot →
          </button>
        </div>
      </div>
    </div>
  );
}
