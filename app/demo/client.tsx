"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Send, Loader2, Sparkles, Lock } from "lucide-react";

const DEMO_LIMIT = 6;
const STORAGE_KEY = "lyra_demo_count";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Lock Screen ───────────────────────────────────────────────────────────────

function LockScreen({ messageCount }: { messageCount: number }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-6"
      style={{ background: "rgba(10,10,15,0.92)", backdropFilter: "blur(12px)" }}>
      <div className="max-w-sm w-full text-center">
        {/* Lyra avatar */}
        <div className="relative mx-auto mb-6 w-20 h-20">
          <div className="absolute inset-0 rounded-full animate-pulse"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)", transform: "scale(1.5)" }} />
          <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
            style={{ background: "linear-gradient(135deg, #7c3aed, #14b8a6)" }}>
            L
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0f] flex items-center justify-center">
            <Lock size={13} className="text-violet-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          You&apos;ve seen what I can do
        </h2>
        <p className="text-white/50 text-sm mb-1">
          {messageCount} messages in. Ready to go deeper?
        </p>
        <p className="text-white/30 text-xs mb-8">
          Unlock unlimited Lyra — memory, tools, game builder, and more.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="block w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7c3aed, #14b8a6)" }}
          >
            Create Free Account
          </Link>
          <Link
            href="/pricing"
            className="block w-full py-3 rounded-xl font-semibold text-sm text-violet-300 border border-violet-500/30 hover:bg-violet-500/10 transition-all"
          >
            View Plans & Pricing
          </Link>
        </div>

        <p className="mt-6 text-xs text-white/20">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
          style={{ background: "linear-gradient(135deg, #7c3aed, #14b8a6)" }}>
          L
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "text-white rounded-tr-sm"
            : "text-white/90 rounded-tl-sm"
        }`}
        style={
          isUser
            ? { background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(20,184,166,0.3))", border: "1px solid rgba(139,92,246,0.3)" }
            : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }
        }
      >
        {message.content}
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function DemoProgress({ used, total }: { used: number; total: number }) {
  const remaining = total - used;
  const pct = (used / total) * 100;
  const color = remaining <= 1 ? "#ef4444" : remaining <= 2 ? "#f59e0b" : "#14b8a6";

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono flex-shrink-0"
        style={{ color: remaining <= 1 ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
        {remaining} / {total} left
      </span>
    </div>
  );
}

// ── Main Demo ─────────────────────────────────────────────────────────────────

const STARTERS = [
  "What makes you different from ChatGPT?",
  "Explain quantum entanglement like I'm 10",
  "Write me a Python web scraper",
  "What can you actually help me build?",
  "Give me a business idea for 2025",
  "Roast my startup idea: [describe it]",
];

export default function DemoClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [remaining, setRemaining] = useState(DEMO_LIMIT);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore count from localStorage
  useEffect(() => {
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    if (stored >= DEMO_LIMIT) {
      setMessageCount(stored);
      setRemaining(0);
      setLocked(true);
    } else {
      setMessageCount(stored);
      setRemaining(DEMO_LIMIT - stored);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming || locked) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/lyra/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-8),
        }),
      });

      if (res.status === 429) {
        setLocked(true);
        setRemaining(0);
        localStorage.setItem(STORAGE_KEY, String(DEMO_LIMIT));
        setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Try again." },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let newRemaining = remaining - 1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "meta") {
              newRemaining = parsed.remaining;
              setRemaining(parsed.remaining);
            } else if (parsed.type === "text") {
              fullText += parsed.text;
              setStreamingText(fullText);
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      const newCount = messageCount + 1;
      setMessageCount(newCount);
      localStorage.setItem(STORAGE_KEY, String(newCount));

      if (newRemaining <= 0) {
        setLocked(true);
        setRemaining(0);
        localStorage.setItem(STORAGE_KEY, String(DEMO_LIMIT));
      }

      setMessages((prev) => [...prev, { role: "assistant", content: fullText }]);
      setStreamingText("");
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Try again." },
      ]);
    } finally {
      setStreaming(false);
    }
  }, [streaming, locked, messages, messageCount, remaining]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages.length === 0 && !streaming;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
            ← aitaskflo
          </Link>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-sm font-semibold">Try Lyra</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
            Demo
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-xs px-3 py-1.5 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7c3aed, #14b8a6)" }}
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      {messages.length > 0 && (
        <DemoProgress used={messageCount} total={DEMO_LIMIT} />
      )}

      {/* Chat area */}
      <div className="flex-1 relative overflow-hidden">
        {locked && <LockScreen messageCount={messageCount} />}

        <div className="h-full overflow-y-auto px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Empty state */}
            {isEmpty && (
              <div className="text-center pt-12 pb-8">
                <div className="relative mx-auto mb-5 w-16 h-16">
                  <div className="absolute inset-0 rounded-full animate-pulse"
                    style={{ background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)", transform: "scale(1.6)" }} />
                  <div className="relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #14b8a6)" }}>
                    L
                  </div>
                </div>
                <h1 className="text-xl font-bold mb-2">Hey, I&apos;m Lyra</h1>
                <p className="text-white/40 text-sm mb-8 max-w-sm mx-auto">
                  A self-evolving AI. Ask me anything — I reason, write code, explain concepts, and build things with you.
                </p>

                {/* Starter prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs px-4 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white/80 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {/* Streaming */}
            {streaming && streamingText && (
              <MessageBubble
                message={{ role: "assistant", content: streamingText }}
              />
            )}
            {streaming && !streamingText && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #14b8a6)" }}>
                  L
                </div>
                <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tl-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/8 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {locked ? (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white text-center transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #14b8a6)" }}
              >
                <Sparkles size={14} className="inline mr-2 -mt-0.5" />
                Create Free Account
              </Link>
              <Link
                href="/pricing"
                className="px-4 py-3 rounded-xl text-sm text-violet-300 border border-violet-500/30 hover:bg-violet-500/10 transition-all"
              >
                Plans
              </Link>
            </div>
          ) : (
            <div className="relative flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-violet-500/40 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={streaming ? "Lyra is thinking..." : "Ask Lyra anything..."}
                disabled={streaming || locked}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 resize-none outline-none max-h-32 overflow-y-auto"
                style={{ lineHeight: "1.5" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming || locked}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: input.trim() && !streaming ? "linear-gradient(135deg, #7c3aed, #14b8a6)" : "rgba(255,255,255,0.1)" }}
              >
                {streaming
                  ? <Loader2 size={14} className="animate-spin text-white/60" />
                  : <Send size={14} className="text-white" />}
              </button>
            </div>
          )}

          {!locked && (
            <p className="text-center text-xs text-white/20 mt-2">
              {remaining > 0
                ? `${remaining} free message${remaining !== 1 ? "s" : ""} remaining · `
                : ""}
              <Link href="/login" className="text-violet-400/70 hover:text-violet-400 transition-colors">
                Sign up for unlimited access
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
