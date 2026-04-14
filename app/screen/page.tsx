"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LyraSpirit, SpiritState } from "@/components/lyra/LyraSpirit";

// ── Floating star background ───────────────────────────────────────────────────
function Stars() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 80 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() * 2.5 + 0.5 + "px",
            height: Math.random() * 2.5 + 0.5 + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            opacity: Math.random() * 0.6 + 0.1,
            animation: `twinkle ${2 + Math.random() * 4}s ease-in-out ${Math.random() * 4}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          from { opacity: 0.1; transform: scale(1); }
          to   { opacity: 0.8; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

// ── Recent activity feed ───────────────────────────────────────────────────────
interface Activity { text: string; detail?: string; time: number; }

export default function ScreenPage() {
  const [state, setState]         = useState<SpiritState>("idle");
  const [message, setMessage]     = useState<string | undefined>();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recognitionRef = useRef<{ stop(): void } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // ── Presence SSE connection ────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/lyra/presence");
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; message?: string; detail?: string };
        if (event.type === "showoff") {
          triggerState("showoff", event.message, 6000);
          if (event.message) {
            setActivities(prev => [
              { text: event.message!, detail: event.detail, time: Date.now() },
              ...prev.slice(0, 4),
            ]);
          }
        } else if (event.type === "thinking") {
          triggerState("thinking", event.message, 4000);
        } else if (event.type === "speaking") {
          triggerState("speaking", event.message, 3000);
        }
      } catch { /* ignore */ }
    };

    return () => es.close();
  }, []);

  // ── Wake word detection ────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    type SRConstructor = new () => {
      continuous: boolean; interimResults: boolean; lang: string;
      onstart: (() => void) | null; onend: (() => void) | null;
      onresult: ((e: { results: { length: number; [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      start(): void; stop(): void;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as SRConstructor | undefined;
    if (!SR) return;

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      setTimeout(() => startListening(), 1000);
    };

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = (last[0].transcript as string).toLowerCase();
      setTranscript(text);

      if (text.includes("lyra")) {
        triggerState("listening", "I heard you...", 3000);
        setTimeout(() => triggerState("showoff", "Here I am ✨", 4000), 500);
      }
    };

    try { recognition.start(); } catch { /* already started */ }
  }, []);

  useEffect(() => {
    startListening();
    return () => {
      recognitionRef.current?.stop();
    };
  }, [startListening]);

  // ── State management ───────────────────────────────────────────────────────
  function triggerState(newState: SpiritState, msg?: string, duration = 3000) {
    clearTimeout(stateTimerRef.current);
    setState(newState);
    setMessage(msg);
    stateTimerRef.current = setTimeout(() => {
      setState("idle");
      setMessage(undefined);
    }, duration);
  }

  // ── Idle breathing messages ────────────────────────────────────────────────
  useEffect(() => {
    const idleMessages = [
      "Watching over you...",
      "Always here...",
      "What shall we do next?",
      "Systems nominal ✦",
      "Dreaming a little...",
      null, null, null, // mostly silent
    ];

    const interval = setInterval(() => {
      if (state === "idle") {
        const msg = idleMessages[Math.floor(Math.random() * idleMessages.length)];
        if (msg) triggerState("idle", msg, 3000);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [state]);

  const bgColor = state === "showoff"   ? "from-[#1a0030] via-[#0d0020] to-[#000010]"
               : state === "thinking"   ? "from-[#001030] via-[#000820] to-[#000010]"
               : state === "listening"  ? "from-[#001820] via-[#000d15] to-[#000010]"
               :                         "from-[#0d0020] via-[#08001a] to-[#000010]";

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${bgColor} transition-colors duration-2000 flex flex-col items-center justify-center overflow-hidden`}>
      <Stars />

      {/* Main spirit */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <LyraSpirit
          state={state}
          size={320}
          message={message}
        />

        {/* Name */}
        <div className="text-center mt-16">
          <h1 className="text-white/80 text-2xl font-light tracking-[0.5em] uppercase">
            Lyra
          </h1>
          <p className="text-white/20 text-xs tracking-widest mt-1 uppercase">
            {state === "listening"  ? "Listening..."
           : state === "thinking"  ? "Thinking..."
           : state === "showoff"   ? "Look what I did!"
           : state === "happy"     ? "Happy!"
           : "Ambient Mode"}
          </p>
        </div>

        {/* Live transcript whisper */}
        {listening && transcript && (
          <p className="text-white/15 text-xs tracking-wider max-w-sm text-center">
            {transcript}
          </p>
        )}
      </div>

      {/* Activity feed — bottom left */}
      {activities.length > 0 && (
        <div className="fixed bottom-8 left-8 z-20 space-y-2 max-w-xs">
          {activities.map((a, i) => (
            <div
              key={a.time}
              className="px-4 py-2.5 rounded-xl text-xs text-white/70"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
                opacity: 1 - i * 0.2,
                animation: i === 0 ? "slideIn 0.4s ease" : undefined,
              }}
            >
              <span className="text-purple-300">{a.text}</span>
              {a.detail && <span className="text-white/40 ml-2">{a.detail}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Wake word hint — bottom right */}
      <div className="fixed bottom-8 right-8 z-20 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${listening ? "bg-green-400 animate-pulse" : "bg-white/10"}`} />
        <span className="text-white/20 text-xs tracking-wider">
          {listening ? 'Listening for "Lyra"' : "Wake word inactive"}
        </span>
      </div>

      {/* Clock */}
      <Clock />

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .transition-colors { transition-property: background-color, border-color, color; }
        .duration-2000 { transition-duration: 2000ms; }
      `}</style>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function update() {
      setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed top-8 right-8 z-20 text-right">
      <p className="text-white/40 text-3xl font-light tracking-widest">{time}</p>
      <p className="text-white/15 text-xs tracking-widest mt-1">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
      </p>
    </div>
  );
}
