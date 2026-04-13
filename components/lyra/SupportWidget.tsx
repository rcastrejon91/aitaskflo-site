"use client";

import { useState } from "react";

type Stage = "idle" | "input" | "fixing" | "fixed" | "escalating" | "escalated";

const FIXING_STEPS = [
  "Reading your issue…",
  "Checking system status…",
  "Running diagnostics…",
  "Attempting fix…",
];

export function SupportWidget() {
  const [stage, setStage] = useState<Stage>("idle");
  const [issue, setIssue] = useState("");
  const [fixStep, setFixStep] = useState(0);
  const [lyraResponse, setLyraResponse] = useState("");

  function open() { setStage("input"); }
  function close() {
    setStage("idle");
    setIssue("");
    setFixStep(0);
    setLyraResponse("");
  }

  async function submit() {
    if (!issue.trim()) return;
    setStage("fixing");
    setFixStep(0);

    // Animate through fixing steps
    for (let i = 1; i < FIXING_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 900));
      setFixStep(i);
    }

    // Hit the API
    const res = await fetch("/api/lyra/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue }),
    });
    const data = await res.json() as { fixed: boolean; response: string };

    setLyraResponse(data.response);

    if (data.fixed) {
      setStage("fixed");
    } else {
      setStage("escalating");
      await new Promise(r => setTimeout(r, 2200));
      setStage("escalated");
    }
  }

  if (stage === "idle") {
    return (
      <button
        onClick={open}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-teal-900/40 flex items-center justify-center hover:scale-110 transition-transform"
        title="Help & Feedback"
      >
        <span className="text-black font-black text-lg">?</span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Modal */}
      <div className="fixed bottom-6 right-6 z-50 w-80 bg-[#0e0e16] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-black text-black text-[10px]">L</div>
          <span className="text-white font-bold text-sm">Lyra Support</span>
          <button onClick={close} className="ml-auto text-white/30 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="p-4">
          {/* Input stage */}
          {stage === "input" && (
            <div className="space-y-3">
              <p className="text-white/50 text-xs">What's going on? Describe the issue and I'll try to fix it.</p>
              <textarea
                autoFocus
                value={issue}
                onChange={e => setIssue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="e.g. Ghost Writer isn't saving my documents…"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-teal-500/50"
              />
              <button
                onClick={submit}
                disabled={!issue.trim()}
                className="w-full py-2 bg-teal-500 text-black font-bold rounded-xl text-sm hover:bg-teal-400 transition-all disabled:opacity-40"
              >
                Submit
              </button>
            </div>
          )}

          {/* Fixing stage */}
          {stage === "fixing" && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-teal-500/40 border-t-teal-400 animate-spin shrink-0" />
                <p className="text-white font-medium text-sm">Let me try to fix this myself…</p>
              </div>
              <div className="space-y-2 pl-11">
                {FIXING_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`text-xs transition-all duration-500 ${
                      i <= fixStep ? "text-teal-400" : "text-white/20"
                    }`}
                  >
                    {i < fixStep ? "✓" : i === fixStep ? "›" : "·"} {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixed stage */}
          {stage === "fixed" && (
            <div className="py-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 text-xs">✓</div>
                <p className="text-teal-400 font-bold text-sm">Found a fix</p>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{lyraResponse}</p>
              <button onClick={close} className="w-full py-2 bg-white/8 text-white/60 rounded-xl text-sm hover:bg-white/12 transition-all">
                Got it, thanks
              </button>
            </div>
          )}

          {/* Escalating stage */}
          {stage === "escalating" && (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/40 border-t-violet-400 animate-spin shrink-0" />
                <p className="text-white font-medium text-sm">Let me escalate this to the support team…</p>
              </div>
              <div className="pl-11 space-y-1.5">
                <p className="text-xs text-violet-400">› Logging your issue…</p>
                <p className="text-xs text-violet-400/60">› Notifying the team…</p>
              </div>
            </div>
          )}

          {/* Escalated stage */}
          {stage === "escalated" && (
            <div className="py-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400 text-xs">↑</div>
                <p className="text-violet-400 font-bold text-sm">Escalated to support</p>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">{lyraResponse}</p>
              <p className="text-white/30 text-xs">The team has been notified. You'll hear back soon.</p>
              <button onClick={close} className="w-full py-2 bg-white/8 text-white/60 rounded-xl text-sm hover:bg-white/12 transition-all">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
