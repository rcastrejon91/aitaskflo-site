"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/lyra/AppShell";
import type { BusinessProfile } from "@/lib/lyra/businessos";

const SECTIONS: { key: keyof BusinessProfile; label: string; icon: string }[] = [
  { key: "plan",        label: "Business Plan",    icon: "📋" },
  { key: "financials",  label: "Financials",       icon: "💰" },
  { key: "playbook",    label: "Operations",       icon: "⚙️" },
  { key: "menu",        label: "Menu & Recipes",   icon: "🍽️" },
  { key: "automations", label: "Automations",      icon: "🤖" },
  { key: "marketing",   label: "Marketing",        icon: "📣" },
];

export default function BusinessClient({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [selected, setSelected] = useState<BusinessProfile | null>(null);
  const [activeSection, setActiveSection] = useState<keyof BusinessProfile>("plan");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/lyra/business");
      const data = await res.json() as { profiles: BusinessProfile[] };
      const list = data.profiles ?? [];
      setProfiles(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await fetch("/api/lyra/business", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selected?.id === id) setSelected(null);
    await loadProfiles();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const availableSections = SECTIONS.filter(s => {
    if (s.key === "menu") return !!selected?.menu;
    return true;
  });

  const sectionContent = selected ? (selected[activeSection] as string | undefined) : null;

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
          <div className="text-teal-400 text-sm">Loading…</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
        {/* Header */}
        <div className="border-b border-white/8 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-black text-xs">B</div>
          <span className="font-bold text-white text-sm">Business OS</span>
          <span className="text-white/30 text-xs ml-1">by Lyra</span>
          {profiles.length > 0 && (
            <span className="ml-auto text-white/20 text-xs">{profiles.length} business{profiles.length !== 1 ? "es" : ""}</span>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-white/8 flex flex-col overflow-y-auto shrink-0">
            <div className="p-4">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Your Businesses</p>

              {profiles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🏢</div>
                  <p className="text-white/30 text-xs mb-4">No businesses yet.</p>
                  <p className="text-white/20 text-xs leading-relaxed">
                    Go to <span className="text-teal-400">/lyra</span> and say:<br />
                    <span className="text-white/40 italic">"Build a business for [name], a [type] in [city]"</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {profiles.map(p => (
                    <div key={p.id} className="group flex items-center gap-1">
                      <button
                        onClick={() => { setSelected(p); setActiveSection("plan"); }}
                        className={`flex-1 text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          selected?.id === p.id
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="font-medium truncate">{p.companyName}</div>
                        <div className="text-xs opacity-50 truncate">{p.businessType} · {p.location}</div>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400/40 hover:text-red-400 text-xs px-1 shrink-0 transition-all"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How to create */}
            <div className="mt-auto border-t border-white/8 p-4">
              <p className="text-white/20 text-xs leading-relaxed">
                💬 Create a new business by chatting with Lyra at <a href="/lyra" className="text-teal-400 hover:underline">/lyra</a>
              </p>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20">
                <div className="text-6xl mb-4">🏢</div>
                <h2 className="text-white font-bold text-2xl mb-2">Business OS</h2>
                <p className="text-white/30 text-sm max-w-md mb-8">
                  Tell Lyra to build a business and it generates your entire business plan, financials, operations playbook, automations, and marketing strategy in one shot.
                </p>
                <div className="bg-white/3 border border-white/8 rounded-2xl p-5 max-w-md text-left">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Try saying to Lyra:</p>
                  <div className="space-y-2">
                    {[
                      `"Build a business for El Fuego, a taco truck in Chicago"`,
                      `"Create a business plan for my SMMA agency in Miami"`,
                      `"Set up a business OS for my online coaching brand"`,
                      `"I want to open a gym in Austin, build the whole plan"`,
                    ].map(ex => (
                      <p key={ex} className="text-teal-400 text-xs font-mono">{ex}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Business header */}
                <div className="border-b border-white/8 px-6 py-4 shrink-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-xl font-black text-white">{selected.companyName}</h1>
                      <p className="text-white/40 text-sm mt-0.5">
                        {selected.businessType} · {selected.location} ·{" "}
                        <span className="text-white/25 text-xs">
                          Built {new Date(selected.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <a
                      href="/lyra"
                      className="px-3 py-1.5 text-xs border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-all"
                    >
                      Chat about this →
                    </a>
                  </div>

                  {/* Section tabs */}
                  <div className="flex gap-1 mt-4 overflow-x-auto scrollbar-hide">
                    {availableSections.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setActiveSection(s.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                          activeSection === s.key
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "text-white/40 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{s.icon}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {sectionContent ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white font-bold">
                          {availableSections.find(s => s.key === activeSection)?.icon}{" "}
                          {availableSections.find(s => s.key === activeSection)?.label}
                        </h2>
                        <button
                          onClick={() => copy(sectionContent)}
                          className="px-3 py-1.5 text-xs border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-all"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                        <pre className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap font-sans">{sectionContent}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/20 text-sm text-center py-20">
                      No content for this section.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
