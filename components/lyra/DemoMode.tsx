"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Search, Mail, QrCode, Brain, GitBranch, Zap, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToolType = "search" | "email" | "memory" | "qr" | "workflow" | "calendar" | "social" | "document";

type WorkflowPhase = "research" | "draft" | "generate" | "save" | "schedule" | "publish";

type DemoStep =
  | { type: "user_message"; content: string; delay?: number }
  | { type: "assistant_message"; content: string; delay?: number; typing?: number }
  | { type: "tool_call"; tool: ToolType; status: string; duration?: number }
  | { type: "annotation"; content: string }
  | { type: "pause"; duration: number }
  | { type: "workflow"; phase: WorkflowPhase }
  | { type: "cta" };

interface Message {
  role: "user" | "assistant";
  content: string;
  id: number;
}

interface ActiveTool {
  tool: ToolType;
  status: string;
  done: boolean;
}

// ── Demo script ───────────────────────────────────────────────────────────────

const DEMO_SCRIPT: DemoStep[] = [
  { type: "annotation", content: "Two prompts. Eight tasks. Watch." },
  { type: "pause", duration: 700 },
  { type: "user_message", content: "I'm launching AITaskFlo Pro next week. Can you research strong competitors, draft a short outreach email, create a QR code for the landing page, and save this for future follow ups?", delay: 500 },
  { type: "pause", duration: 600 },
  { type: "workflow", phase: "research" },
  { type: "tool_call", tool: "search", status: "Reviewing Zapier, Make.com, Notion AI", duration: 1600 },
  { type: "annotation", content: "Real tasks. Not just suggestions." },
  { type: "assistant_message", content: "I found strong competitors including **Zapier**, **Make.com**, and **Notion AI**.\n\nHere is what makes AITaskFlo different.\n\nLyra remembers your business across conversations so you do not need to repeat context every time.\n\nLyra improves over time by learning from interactions and adjusting how it helps.\n\nI will now draft the outreach email, create the QR code, and save this so we can build on it later.", delay: 350, typing: 22 },
  { type: "pause", duration: 400 },
  { type: "workflow", phase: "draft" },
  { type: "tool_call", tool: "email", status: "Preparing introduction message", duration: 1400 },
  { type: "assistant_message", content: "**Subject:** The AI that actually learns your business\n\nHi [Name],\n\nMost AI tools forget everything once you close the tab. Lyra does not.\n\nLyra remembers your goals, improves from every conversation, and becomes more useful the more you use it. No repeating context and no starting over.\n\nWe are launching AITaskFlo Pro next week and would love to show you how it works in practice.\n\nYou can preview it here\naitaskflo.com\n\nBest regards\nAITaskFlo Team", delay: 250, typing: 15 },
  { type: "pause", duration: 500 },
  { type: "workflow", phase: "generate" },
  { type: "tool_call", tool: "qr", status: "QR code ready to use", duration: 1000 },
  { type: "pause", duration: 300 },
  { type: "workflow", phase: "save" },
  { type: "tool_call", tool: "memory", status: "Launch details stored", duration: 800 },
  { type: "tool_call", tool: "workflow", status: "Next step suggestions ready", duration: 900 },
  { type: "annotation", content: "Saved. Picks up right here next session." },
  { type: "assistant_message", content: "Everything is ready.\n\n**Competitor insights** prepared.\n**Outreach email** ready to send.\n**QR code** created for your landing page.\n**Launch details** saved so we can continue from here next time.\n\nWould you like me to write a LinkedIn post for the launch or schedule any follow up reminders?", delay: 350, typing: 18 },
  { type: "pause", duration: 900 },

  // ── Round 2 ──────────────────────────────────────────────────────────────────
  { type: "user_message", content: "Yes. Write a LinkedIn post for the launch and schedule a follow up reminder for next Friday. Also pull together a short summary report I can send the team.", delay: 400 },
  { type: "pause", duration: 600 },
  { type: "workflow", phase: "publish" },
  { type: "tool_call", tool: "social", status: "Writing LinkedIn launch post", duration: 1400 },
  { type: "assistant_message", content: "**LinkedIn post ready:**\n\nWe built an AI that actually remembers you.\n\nMost tools reset every conversation. Lyra does not. She learns your goals, improves from every session, and gets more useful over time.\n\nAITaskFlo Pro is launching next week.\n\nIf you want an AI that works with you instead of starting over every time, this is it.\n\nLink in bio. aitaskflo.com", delay: 300, typing: 14 },
  { type: "pause", duration: 400 },
  { type: "workflow", phase: "schedule" },
  { type: "tool_call", tool: "calendar", status: "Scheduling follow up for next Friday", duration: 1100 },
  { type: "tool_call", tool: "document", status: "Compiling launch summary report", duration: 1300 },
  { type: "annotation", content: "Eight tasks. One conversation." },
  { type: "assistant_message", content: "All done.\n\n**LinkedIn post** drafted and ready to copy.\n**Follow up** scheduled for Friday at 10am.\n**Team summary** prepared with competitor insights, outreach copy, and next steps.\n\nI have saved everything. Next time we pick up from here, I will already know where we left off.", delay: 350, typing: 16 },
  { type: "pause", duration: 800 },
  { type: "cta" },
];

// ── Workflow phases ────────────────────────────────────────────────────────────

const WORKFLOW_PHASES: { id: WorkflowPhase; label: string }[] = [
  { id: "research", label: "Research" },
  { id: "draft",    label: "Draft"    },
  { id: "generate", label: "Generate" },
  { id: "save",     label: "Save"     },
  { id: "schedule", label: "Schedule" },
  { id: "publish",  label: "Publish"  },
];

// ── Tool config ───────────────────────────────────────────────────────────────

const TOOL_CONFIG: Record<ToolType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  search:   { icon: <Search className="w-3.5 h-3.5" />,    label: "Web Search",    color: "text-blue-400",   bg: "rgba(59,130,246,0.1)"   },
  email:    { icon: <Mail className="w-3.5 h-3.5" />,      label: "Email Draft",   color: "text-green-400",  bg: "rgba(34,197,94,0.1)"    },
  memory:   { icon: <Brain className="w-3.5 h-3.5" />,     label: "Memory",        color: "text-violet-400", bg: "rgba(139,92,246,0.1)"   },
  qr:       { icon: <QrCode className="w-3.5 h-3.5" />,    label: "QR Code",       color: "text-yellow-400", bg: "rgba(234,179,8,0.1)"    },
  workflow: { icon: <GitBranch className="w-3.5 h-3.5" />, label: "Follow Up",     color: "text-pink-400",   bg: "rgba(236,72,153,0.1)"   },
  calendar: { icon: <Zap className="w-3.5 h-3.5" />,       label: "Calendar",      color: "text-orange-400", bg: "rgba(249,115,22,0.1)"   },
  social:   { icon: <Sparkles className="w-3.5 h-3.5" />,  label: "Social Post",   color: "text-sky-400",    bg: "rgba(14,165,233,0.1)"   },
  document: { icon: <ChevronRight className="w-3.5 h-3.5" />, label: "Report",     color: "text-emerald-400",bg: "rgba(16,185,129,0.1)"   },
};

// ── Typing animation ──────────────────────────────────────────────────────────

function useTypingText(target: string, speed = 22, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) { setDisplayed(target); setDone(true); return; }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(target.slice(0, i));
      if (i >= target.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [target, speed, active]);
  return { displayed, done };
}

// ── Tool badge ────────────────────────────────────────────────────────────────

function ToolBadge({ tool, status, done }: { tool: ToolType; status: string; done: boolean }) {
  const cfg = TOOL_CONFIG[tool];
  const isMemory = tool === "memory";
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.bg.replace("0.1", "0.25")}`,
        ...(isMemory && done ? { boxShadow: "0 0 12px rgba(139,92,246,0.35)" } : {}),
      }}
    >
      <span className={cfg.color}>{cfg.icon}</span>
      <span className="text-white/60">{cfg.label}</span>
      <span className="text-white/35 flex-1 truncate">{status}</span>
      {done ? (
        <span className="text-green-400 font-semibold">✓</span>
      ) : (
        <span className="flex gap-0.5">
          {[0,1,2].map(i => (
            <span key={i} className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </span>
      )}
    </motion.div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function DemoBubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const isUser = msg.role === "user";
  const { displayed } = useTypingText(msg.content, 15, isLast && !isUser);

  const text = (isLast && !isUser) ? displayed : msg.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-violet-500/25">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      )}
      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap ${
        isUser
          ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-br-sm"
          : "bg-white/[0.05] text-white/90 border border-white/[0.07] rounded-bl-sm"
      }`}>
        {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
        )}
        {isLast && !isUser && displayed.length < msg.content.length && (
          <span className="inline-block w-0.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 mt-0.5 text-white/50 text-xs font-semibold">
          R
        </div>
      )}
    </motion.div>
  );
}

// ── Workflow indicator ─────────────────────────────────────────────────────────

function WorkflowIndicator({ active }: { active: WorkflowPhase | null }) {
  if (!active) return null;
  return (
    <div className="px-5 py-2 flex items-center justify-center gap-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {WORKFLOW_PHASES.map((phase, i) => {
        const phases = WORKFLOW_PHASES.map(p => p.id);
        const activeIdx = active ? phases.indexOf(active) : -1;
        const phaseIdx = phases.indexOf(phase.id);
        const isActive = phase.id === active;
        const isDone = phaseIdx < activeIdx;

        return (
          <div key={phase.id} className="flex items-center gap-1.5">
            <motion.span
              animate={{
                color: isActive ? "rgb(196,181,253)" : isDone ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)",
              }}
              transition={{ duration: 0.3 }}
              className="text-xs font-medium"
            >
              {phase.label}
            </motion.span>
            {isActive && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-1 h-1 rounded-full bg-violet-400"
              />
            )}
            {i < WORKFLOW_PHASES.length - 1 && (
              <span className="text-white/15 text-xs">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main demo component ───────────────────────────────────────────────────────

export default function DemoMode({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tools, setTools] = useState<ActiveTool[]>([]);
  const [annotation, setAnnotation] = useState("");
  const [showCta, setShowCta] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [msgId, setMsgId] = useState(0);
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tools]);

  useEffect(() => {
    if (stepIndex >= DEMO_SCRIPT.length) return;
    const step = DEMO_SCRIPT[stepIndex];
    const delay = ("delay" in step ? step.delay : 0) ?? 0;

    const t = setTimeout(() => {
      if (step.type === "user_message") {
        const id = msgId;
        setMsgId(n => n + 1);
        setMessages(prev => [...prev, { role: "user", content: step.content, id }]);
        setStepIndex(i => i + 1);

      } else if (step.type === "assistant_message") {
        const id = msgId;
        setMsgId(n => n + 1);
        setMessages(prev => [...prev, { role: "assistant", content: step.content, id }]);
        const typingDuration = step.content.length * (step.typing ?? 22);
        const t2 = setTimeout(() => setStepIndex(i => i + 1), typingDuration + 400);
        timeoutsRef.current.push(t2);

      } else if (step.type === "tool_call") {
        const tool: ActiveTool = { tool: step.tool, status: step.status, done: false };
        setTools(prev => [...prev, tool]);
        const duration = step.duration ?? 1500;
        const t2 = setTimeout(() => {
          setTools(prev => prev.map(t => t.tool === step.tool && !t.done ? { ...t, done: true } : t));
          setStepIndex(i => i + 1);
        }, duration);
        timeoutsRef.current.push(t2);

      } else if (step.type === "annotation") {
        setAnnotation(step.content);
        const t2 = setTimeout(() => { setAnnotation(""); setStepIndex(i => i + 1); }, 2800);
        timeoutsRef.current.push(t2);

      } else if (step.type === "workflow") {
        setWorkflowPhase(step.phase);
        setStepIndex(i => i + 1);

      } else if (step.type === "pause") {
        const t2 = setTimeout(() => setStepIndex(i => i + 1), step.duration);
        timeoutsRef.current.push(t2);

      } else if (step.type === "cta") {
        setShowCta(true);
      }
    }, delay);

    timeoutsRef.current.push(t);
    return () => { /* cleanup handled on unmount */ };
  }, [stepIndex]);

  useEffect(() => {
    return () => { timeoutsRef.current.forEach(clearTimeout); };
  }, []);

  const progress = Math.round((stepIndex / DEMO_SCRIPT.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Watch Lyra Work</span>
              <span className="text-xs text-white/30 ml-2">Live demo</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-24 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
              <span className="text-xs text-white/25">{progress}%</span>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workflow indicator */}
        <AnimatePresence>
          {workflowPhase && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <WorkflowIndicator active={workflowPhase} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Annotation banner */}
        <AnimatePresence>
          {annotation && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="px-5 py-2.5 text-xs text-center"
              style={{ background: "rgba(109,40,217,0.12)", borderBottom: "1px solid rgba(109,40,217,0.2)", color: "rgb(196,181,253)" }}
            >
              <Zap className="w-3 h-3 inline mr-1.5 mb-0.5" />
              {annotation}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ minHeight: 0 }}>
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <DemoBubble key={msg.id} msg={msg} isLast={i === messages.length - 1} />
            ))}
          </AnimatePresence>

          {/* Tool calls */}
          {tools.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pl-9">
              {tools.map((t, i) => (
                <ToolBadge key={i} tool={t.tool} status={t.status} done={t.done} />
              ))}
            </motion.div>
          )}

          {/* CTA */}
          <AnimatePresence>
            {showCta && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 220 }}
                className="rounded-2xl p-6 text-center mt-4"
                style={{ background: "rgba(109,40,217,0.08)", border: "1px solid rgba(109,40,217,0.2)" }}
              >
                <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-medium">Two prompts. Eight tasks. Zero back and forth.</p>
                <p className="text-white font-semibold text-lg mb-1">Now imagine this helping with your daily work.</p>
                <p className="text-white/40 text-sm mb-5">One AI that remembers context, completes tasks, and helps you move faster.</p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/login" onClick={onClose}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg"
                      style={{ background: "linear-gradient(135deg, rgb(109,40,217), rgb(134,25,143))", boxShadow: "0 4px 20px rgba(109,40,217,0.35)" }}
                    >
                      Try Lyra Free
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </Link>
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        {!showCta && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-xs text-white/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Real tools running live
            </span>
            <Link href="/login" onClick={onClose} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Skip to Lyra <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
