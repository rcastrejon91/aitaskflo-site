"use client";
import Link from "next/link";
export default function Home() {
  const features = [
    { icon: "\u26A1", title: "Lightning Fast", desc: "Create automations in seconds with natural language" },
    { icon: "\uD83D\uDEE1\uFE0F", title: "Enterprise Security", desc: "Bank-level encryption keeps your data safe" },
    { icon: "\uD83D\uDCC8", title: "Scales With You", desc: "From solo founders to enterprise teams" },
  ];
  const plans = [
    { name: "Starter", price: "", period: "/mo", features: ["5 workflows","1K executions","Chat with Lyra","Community support"], popular: false },
    { name: "Pro", price: "", period: "/mo", features: ["Unlimited workflows","50K executions","All integrations","Priority support"], popular: true },
    { name: "Enterprise", price: "Custom", period: "", features: ["Unlimited everything","SOC2 and SSO","Dedicated support","On-prem option"], popular: false },
  ];
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-xl font-bold">AITaskFlo</span>
          <Link href="/chat" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">Try Lyra</Link>
        </div>
      </nav>
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm mb-8">AI-Powered Automation Platform</div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">Automate anything<br /><span className="text-blue-400">with AI in seconds</span></h1>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">Meet Lyra — your AI assistant that builds workflows, connects your tools, and runs automations while you sleep.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/chat" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors">Chat with Lyra</Link>
            <button className="px-8 py-3 bg-white/10 hover:bg-white/15 rounded-lg font-semibold text-lg border border-white/10 transition-colors">Watch Demo</button>
          </div>
        </div>
      </section>
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12"><h2 className="text-3xl font-bold mb-3">Why AITaskFlo?</h2><p className="text-gray-400">Everything you need to automate your workflow</p></div>
          <div className="grid md:grid-cols-3 gap-6">{features.map((f, i) => (<div key={i} className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"><div className="text-3xl mb-4">{f.icon}</div><h3 className="text-lg font-bold mb-2">{f.title}</h3><p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p></div>))}</div>
        </div>
      </section>
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12"><h2 className="text-3xl font-bold mb-3">Simple Pricing</h2><p className="text-gray-400">Start free, scale when ready</p></div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">{plans.map((plan, i) => (<div key={i} className={"p-6 rounded-xl border transition-colors " + (plan.popular ? "bg-blue-600/10 border-blue-500/40" : "bg-white/5 border-white/10")}>{plan.popular && <div className="text-xs font-bold text-blue-400 mb-2">MOST POPULAR</div>}<h3 className="text-xl font-bold mb-1">{plan.name}</h3><div className="text-3xl font-bold mb-1">{plan.price}<span className="text-sm text-gray-400 font-normal">{plan.period}</span></div><ul className="mt-4 space-y-2">{plan.features.map((f, j) => (<li key={j} className="flex items-center gap-2 text-sm text-gray-300"><span className="text-green-400">&#10003;</span> {f}</li>))}</ul><button className={"w-full mt-6 py-2 rounded-lg font-medium text-sm transition-colors " + (plan.popular ? "bg-blue-600 hover:bg-blue-700" : "bg-white/10 hover:bg-white/15 border border-white/10")}>Get Started</button></div>))}</div>
        </div>
      </section>
      <footer className="border-t border-white/10 py-8 px-6"><div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">2026 AITaskFlo. All rights reserved.</div></footer>
    </div>
  );
}
