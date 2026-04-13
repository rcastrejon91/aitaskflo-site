"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageRenderer } from "@/components/lyra/MessageRenderer";
import { Send, Mic, Paperclip, MoreHorizontal } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full"
          style={{
            background: "rgba(139,92,246,0.7)",
            animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
      ))}
    </div>
  );
}

export default function PersonalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  async function send(text = input.trim()) {
    if (!text || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text, id: Date.now().toString() };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId }]);
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/lyra/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m));
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setMessages(prev => prev.map(m => m.id === assistantId
          ? { ...m, content: "Something went wrong. Try again." }
          : m
        ));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col" style={{ height: "100dvh", background: "#07070f" }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

        <div className="relative">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #6d28d9, #86198f)" }}>
            L
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
            style={{ background: "#10b981", borderColor: "#07070f" }} />
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Lyra</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>personal · always on</p>
        </div>

        <div className="ml-auto">
          <button className="p-2 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.2)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: "linear-gradient(135deg, #6d28d9, #86198f)", boxShadow: "0 0 40px rgba(109,40,217,0.3)" }}>
              L
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Hey Ricky.</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>What&apos;s on your mind?</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2 max-w-sm">
              {[
                "What should we build today?",
                "Plan today's gigs",
                "Check earnings",
                "New Gumroad product idea",
                "What's next on aitaskflo?",
              ].map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs px-3 py-2 rounded-full transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(109,40,217,0.2)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #86198f)" }}>
                  L
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
                {msg.role === "user" ? (
                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
                    style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "white" }}>
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.87)" }}>
                    {msg.content === "" && streaming && i === messages.length - 1
                      ? <TypingDots />
                      : <MessageRenderer content={msg.content} />
                    }
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-6 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 rounded-2xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <button className="p-1 mb-0.5 flex-shrink-0 transition-colors"
              style={{ color: "rgba(255,255,255,0.2)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              placeholder="Talk to Lyra…"
              disabled={streaming}
              className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.9)",
                minHeight: "24px",
                maxHeight: "160px",
                caretColor: "#8b5cf6",
              }}
            />

            <div className="flex items-center gap-1.5 mb-0.5 flex-shrink-0">
              <button className="p-1 transition-colors"
                style={{ color: "rgba(255,255,255,0.2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => send()}
                disabled={!input.trim() || streaming}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: input.trim() && !streaming ? "linear-gradient(135deg, #6d28d9, #4f46e5)" : "rgba(255,255,255,0.06)",
                  color: input.trim() && !streaming ? "white" : "rgba(255,255,255,0.2)",
                }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-center mt-2 text-xs" style={{ color: "rgba(255,255,255,0.12)" }}>
            Personal mode · all tools · no limits
          </p>
        </div>
      </div>
    </div>
  );
}
