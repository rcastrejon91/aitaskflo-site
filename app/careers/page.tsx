import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers — AITaskFlo",
  description: "Join the team building Lyra. Early stage, real work, big vision.",
};

const ROLES = [
  {
    title: "Full Stack Engineer",
    type: "Volunteer / Equity",
    emoji: "⚡",
    desc: "Build features end to end. Next.js, TypeScript, APIs, databases. You'll ship real code that real people use — not just push to a branch and wait 6 months for review.",
    skills: ["Next.js", "TypeScript", "React", "Node.js"],
  },
  {
    title: "AI / ML Engineer",
    type: "Volunteer / Equity",
    emoji: "🧠",
    desc: "Work on Lyra's brain. Tool design, memory systems, RAG, multi-model orchestration. If you think about how AI agents should actually work, we want to talk.",
    skills: ["LLMs", "RAG", "Python or TypeScript", "Prompt Engineering"],
  },
  {
    title: "UI / UX Designer",
    type: "Volunteer / Equity",
    emoji: "🎨",
    desc: "Make Lyra feel as good as she works. We care deeply about design — clean, dark, fast, no clutter. If you hate over-designed SaaS dashboards as much as we do, you'll fit right in.",
    skills: ["Figma", "Design Systems", "Frontend basics"],
  },
  {
    title: "Growth & Marketing",
    type: "Volunteer / Equity",
    emoji: "📣",
    desc: "Get the word out. Truckers, small businesses, developers, AI enthusiasts — we have a product and a story. Help us tell it in a way that actually lands.",
    skills: ["Content", "Social Media", "SEO", "Community"],
  },
  {
    title: "Trucking Industry Advisor",
    type: "Volunteer / Equity",
    emoji: "🚛",
    desc: "You know the industry. HOS rules, broker headaches, load boards, ELDs — you've lived it. Help us build tools that actually solve real problems for real drivers.",
    skills: ["CDL Experience", "Logistics Knowledge", "Willing to give feedback"],
  },
  {
    title: "Business Development",
    type: "Volunteer / Equity",
    emoji: "🤝",
    desc: "Find our first paying customers. Talk to businesses, understand their pain, match them with what Lyra can do. This is the role that turns a cool project into a real company.",
    skills: ["Sales", "Relationship building", "Hustle"],
  },
];

const VALUES = [
  { emoji: "🚀", title: "Ship fast", desc: "We build in public, deploy often, and learn from real usage. Done is better than perfect." },
  { emoji: "🧠", title: "Think deeply", desc: "We're not just wrapping ChatGPT. We're building something that actually learns, grows, and helps people." },
  { emoji: "😂", title: "Have fun", desc: "We work hard but we don't take ourselves too seriously. If Lyra can sing and trade stocks, we're allowed to laugh." },
  { emoji: "🤝", title: "Be real", desc: "No corporate speak, no fake roadmaps, no pretending we're bigger than we are. Just honest people building something cool." },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-500/8 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 relative z-10">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-black text-black">A</div>
            <span className="font-bold text-white">AITaskFlo</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 text-teal-400 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            Actively looking for early team members
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
            Build the future<br />
            <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
              of AI with us.
            </span>
          </h1>

          <p className="text-white/50 text-xl max-w-2xl leading-relaxed mb-8">
            We're not funded yet. We don't have a ping pong table or free catered lunch. What we have is a real product, a growing user base, and the kind of early-stage energy that most people only get to experience once.
          </p>

          <p className="text-white/70 text-lg max-w-2xl leading-relaxed">
            If you want to get in early, learn fast, ship real things, and actually shape what this becomes — that's the opportunity.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-white/30 text-sm uppercase tracking-widest font-semibold mb-8">How we work</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VALUES.map(v => (
            <div key={v.title} className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className="text-2xl mb-3">{v.emoji}</div>
              <h3 className="text-white font-bold mb-1">{v.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Roles */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-white/30 text-sm uppercase tracking-widest font-semibold mb-8">Open roles</h2>
        <div className="space-y-4">
          {ROLES.map(role => (
            <div key={role.title} className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-teal-500/30 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{role.emoji}</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">{role.title}</h3>
                    <span className="text-teal-400 text-xs font-medium bg-teal-500/10 border border-teal-500/20 rounded-full px-2 py-0.5">
                      {role.type}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-white/50 text-sm leading-relaxed mb-4">{role.desc}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {role.skills.map(s => (
                  <span key={s} className="text-xs text-white/40 bg-white/5 border border-white/8 rounded-lg px-2 py-1">{s}</span>
                ))}
              </div>

              <a
                href={`mailto:aitaskflo@gmail.com?subject=Applying for ${role.title}&body=Hi, I'm interested in the ${role.title} role at AITaskFlo. Here's a bit about me:%0A%0A`}
                className="inline-flex items-center gap-2 text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors"
              >
                Apply for this role →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-black mb-4">Don't see your role?</h2>
          <p className="text-white/40 mb-8 max-w-md mx-auto">
            If you believe in what we're building and think you can contribute, reach out anyway. We're open to good people.
          </p>
          <a
            href="mailto:aitaskflo@gmail.com?subject=I want to join AITaskFlo"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-black font-black rounded-2xl hover:from-teal-400 hover:to-cyan-400 transition-all hover:scale-105 active:scale-95"
          >
            Get in touch
          </a>
          <p className="text-white/20 text-xs mt-4">We read every email. Really.</p>
        </div>
      </div>
    </div>
  );
}
