"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, ArrowLeft, Paperclip, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { MessageRenderer } from "./MessageRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface AttachedFile {
  dataUrl: string;
  base64: string;
  mimeType: string;
  name: string;
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function LyraChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(generateId);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [userId] = useState(() => {
    if (typeof window === "undefined") return generateId();
    const stored = localStorage.getItem("lyra_user_id");
    if (stored) return stored;
    const id = generateId();
    localStorage.setItem("lyra_user_id", id);
    return id;
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-warm image generation models as soon as the page loads
  useEffect(() => {
    fetch("/api/lyra/warmup", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        setAttachedFiles((prev) => [
          ...prev,
          { dataUrl, base64, mimeType: file.type, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  async function send() {
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || loading) return;

    const filesToSend = [...attachedFiles];
    setInput("");
    setAttachedFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "52px";

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg: Message = {
      role: "user",
      content: text,
      images: filesToSend.map((f) => f.dataUrl),
    };
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/lyra/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || "Please analyze the attached file(s).",
          history,
          conversationId,
          userId,
          images: filesToSend.map((f) => ({ data: f.base64, mimeType: f.mimeType })),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: updated[updated.length - 1].content + chunk };
          return updated;
        });
      }

      // Background reflection — runs after every 2+ exchanges to keep memory fresh
      if (history.length >= 2) {
        fetch("/api/lyra/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, agentId: "lyra-v1", transcript: messages, userId }),
        }).catch(() => {});
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "52px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  const QUICK_PROMPTS = [
    "Generate an image of a futuristic city at sunset",
    "What's the latest news in AI?",
    "Generate a QR code for https://aitaskflo.com",
    "Translate 'You are the future' into Japanese, Spanish, and Arabic",
  ];

  return (
    <div className="flex flex-col bg-[#0d0d0f] text-white" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-white/[0.07] flex-shrink-0">
        <Link href="/" className="text-white/30 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">Lyra</span>
        </div>
        <div className="ml-2 flex items-center gap-1.5 text-[11px] text-white/30">
          <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">image gen</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">memory</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">tools</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-violet-500/25">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Lyra</h1>
                <p className="text-white/40 text-sm max-w-xs leading-relaxed">
                  Generate images, write code, automate workflows, understand files — all in one place.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                    className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-white/60 hover:text-white/80 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%] ${
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : "bg-white/[0.06] text-white/90 border border-white/[0.07] rounded-bl-sm"
              }`}>
                {/* User images */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.images.map((src, j) => (
                      <img key={j} src={src} alt="attachment" className="max-h-40 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                {msg.content === "" && loading && i === messages.length - 1 ? (
                  <span className="flex gap-1 py-0.5">
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </span>
                ) : (
                  <MessageRenderer content={msg.content} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap max-w-2xl mx-auto w-full">
          {attachedFiles.map((f, i) => (
            <div key={i} className="relative group">
              {f.mimeType.startsWith("image/") ? (
                <img src={f.dataUrl} alt={f.name} className="h-16 w-16 object-cover rounded-lg border border-white/10" />
              ) : (
                <div className="h-16 w-16 rounded-lg border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1">
                  <ImageIcon className="w-5 h-5 text-white/40" />
                  <span className="text-[9px] text-white/40 truncate w-12 text-center">{f.name}</span>
                </div>
              )}
              <button
                onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-white/[0.07]">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.csv"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-white/40 hover:text-white/70 transition-all"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <div className="flex-1 bg-white/[0.05] border border-white/[0.10] rounded-2xl focus-within:border-violet-500/50 transition-colors overflow-hidden">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKey}
              placeholder="Message Lyra… (generate images, write code, automate workflows)"
              disabled={loading}
              className="w-full bg-transparent text-white placeholder-white/25 px-4 py-3.5 resize-none focus:outline-none text-sm"
              style={{ minHeight: "52px", maxHeight: "180px" }}
              rows={1}
            />
          </div>
          <button
            onClick={send}
            disabled={(!input.trim() && attachedFiles.length === 0) || loading}
            className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
          >
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-white/20 mt-2">Lyra · self-improving AI · powered by Claude</p>
      </div>
    </div>
  );
}
