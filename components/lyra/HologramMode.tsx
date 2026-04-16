"use client";

/**
 * components/lyra/HologramMode.tsx
 * Full-screen hologram TV overlay for Lyra's story mode.
 *
 * Props:
 *   isActive  — whether the overlay is shown
 *   onClose   — callback to dismiss
 *   storyText — streaming story text to display
 */

import { useEffect, useRef, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface HologramModeProps {
  isActive: boolean;
  onClose: () => void;
  storyText?: string;
}

// Generate random floating particles
function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    speed: Math.random() * 8 + 4,
    opacity: Math.random() * 0.6 + 0.2,
  }));
}

export default function HologramMode({ isActive, onClose, storyText = "" }: HologramModeProps) {
  const [particles] = useState<Particle[]>(() => makeParticles(40));
  const [visible, setVisible] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Fade in/out on activation
  useEffect(() => {
    if (isActive) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Auto-scroll story text to bottom as it streams
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [storyText]);

  // Close on Escape key
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, onClose]);

  if (!visible) return null;

  return (
    <div
      className="hologram-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 2, 12, 0.96)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: isActive ? 1 : 0,
        transition: "opacity 0.4s ease",
        overflow: "hidden",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Hologram Story Mode"
    >
      {/* Scan-line effect */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.025) 2px, rgba(0, 255, 255, 0.025) 4px)",
          zIndex: 1,
        }}
      />

      {/* Floating particles */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
        {particles.map((p) => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "cyan",
              opacity: p.opacity,
              animation: `hologram-float ${p.speed}s ease-in-out infinite alternate`,
              animationDelay: `${(p.id * 0.3) % p.speed}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "min(720px, 90vw)",
          gap: "2rem",
        }}
      >
        {/* Avatar glow */}
        <div
          aria-hidden="true"
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #00ffff44, #003355cc, #000820)",
            border: "2px solid rgba(0, 255, 255, 0.6)",
            boxShadow: "0 0 40px rgba(0, 255, 255, 0.5), 0 0 80px rgba(0, 200, 255, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            filter: "hue-rotate(180deg) saturate(1.5) brightness(1.1)",
            animation: "hologram-pulse 3s ease-in-out infinite",
          }}
        >
          🤖
        </div>

        {/* Story text panel */}
        <div
          ref={textRef}
          style={{
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            fontSize: "clamp(14px, 2vw, 18px)",
            lineHeight: 1.8,
            color: "rgba(0, 255, 240, 0.9)",
            textShadow: "0 0 8px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 200, 255, 0.4)",
            maxHeight: "50vh",
            overflowY: "auto",
            padding: "1.5rem 2rem",
            background: "rgba(0, 255, 255, 0.04)",
            border: "1px solid rgba(0, 255, 255, 0.2)",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            width: "100%",
            scrollbarColor: "rgba(0,255,255,0.3) transparent",
          }}
        >
          {storyText || (
            <span style={{ opacity: 0.5 }}>
              Initializing story transmission...
            </span>
          )}
          {/* Blinking cursor at end */}
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: "1em",
              background: "rgba(0,255,255,0.8)",
              marginLeft: 2,
              verticalAlign: "text-bottom",
              animation: "hologram-blink 1s step-end infinite",
            }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 13,
            color: "rgba(0, 255, 255, 0.7)",
            background: "transparent",
            border: "1px solid rgba(0, 255, 255, 0.3)",
            borderRadius: 4,
            padding: "6px 20px",
            cursor: "pointer",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,255,0.12)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,255,255,1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,255,255,0.7)";
          }}
        >
          [ ESC ] Exit Hologram
        </button>
      </div>

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes hologram-float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-20px) scale(1.2); }
        }
        @keyframes hologram-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(0,255,255,0.5), 0 0 80px rgba(0,200,255,0.2); }
          50%       { box-shadow: 0 0 60px rgba(0,255,255,0.8), 0 0 120px rgba(0,200,255,0.4); }
        }
        @keyframes hologram-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
