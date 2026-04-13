"use client";

import { useEffect, useRef, useState } from "react";

export type SpiritState = "idle" | "listening" | "thinking" | "showoff" | "happy" | "speaking";

interface LyraSpiritProps {
  state?: SpiritState;
  size?: number;
  message?: string;
  className?: string;
}

export function LyraSpirit({ state = "idle", size = 200, message, className = "" }: LyraSpiritProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const timeRef   = useRef(0);
  const [displayMsg, setDisplayMsg] = useState(message);

  useEffect(() => { setDisplayMsg(message); }, [message]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = size;
    const H = canvas.height = size;
    const cx = W / 2;
    const cy = H / 2;

    // Particle system
    interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number; }
    const particles: Particle[] = [];

    function spawnParticle(x: number, y: number, burst = false) {
      const count = burst ? 8 : 1;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = burst ? (1 + Math.random() * 3) : (0.2 + Math.random() * 0.8);
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (burst ? 0 : 0.5),
          life: 1,
          maxLife: 0.4 + Math.random() * 0.6,
          size: burst ? (2 + Math.random() * 3) : (1 + Math.random() * 2),
          hue: state === "showoff" ? (Math.random() * 60 + 280)
             : state === "thinking" ? (200 + Math.random() * 40)
             : state === "happy" ? (40 + Math.random() * 40)
             : (260 + Math.random() * 80),
        });
      }
    }

    function drawFrame(t: number) {
      timeRef.current = t;
      ctx.clearRect(0, 0, W, H);

      const baseFloat = Math.sin(t * 0.001) * 6;
      const breathe   = Math.sin(t * 0.0015) * 0.04 + 1;
      const bodyY     = cy + baseFloat;
      const bodyR     = size * 0.22 * breathe;

      // ── Outer glow ──────────────────────────────────────────────────────
      const glowR = bodyR * (state === "showoff" ? 2.8 + Math.sin(t * 0.003) * 0.4 : 2.2);
      const glowColor = state === "showoff"  ? `hsla(300,100%,70%,` :
                        state === "thinking" ? `hsla(210,100%,70%,` :
                        state === "happy"    ? `hsla(45,100%,70%,`  :
                        state === "listening"? `hsla(180,100%,65%,` :
                                              `hsla(270,100%,65%,`;

      const outerGlow = ctx.createRadialGradient(cx, bodyY, 0, cx, bodyY, glowR);
      outerGlow.addColorStop(0,   glowColor + "0.25)");
      outerGlow.addColorStop(0.4, glowColor + "0.12)");
      outerGlow.addColorStop(1,   glowColor + "0)");
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, bodyY, glowR, 0, Math.PI * 2);
      ctx.fill();

      // ── Flowing hair/aura tendrils ───────────────────────────────────────
      const tendrils = state === "showoff" ? 8 : 5;
      for (let i = 0; i < tendrils; i++) {
        const baseAngle = (i / tendrils) * Math.PI * 2 + t * 0.0008;
        const wave = Math.sin(t * 0.002 + i * 1.3) * 12;
        const len  = bodyR * (1.4 + Math.sin(t * 0.0012 + i) * 0.3);
        const ex   = cx + Math.cos(baseAngle) * (len + wave);
        const ey   = bodyY + Math.sin(baseAngle) * (len + wave * 0.5);
        const hue  = (270 + i * (state === "showoff" ? 45 : 15)) % 360;

        ctx.beginPath();
        ctx.moveTo(cx, bodyY);
        const cp1x = cx + Math.cos(baseAngle + 0.5) * len * 0.6;
        const cp1y = bodyY + Math.sin(baseAngle + 0.5) * len * 0.6;
        ctx.quadraticCurveTo(cp1x, cp1y, ex, ey);
        ctx.strokeStyle = `hsla(${hue},100%,75%,${0.15 + Math.sin(t * 0.002 + i) * 0.08})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Tendril tip sparkle
        if (Math.random() < 0.04) spawnParticle(ex, ey);
      }

      // ── Body (orb) ────────────────────────────────────────────────────────
      const bodyGrad = ctx.createRadialGradient(cx - bodyR * 0.3, bodyY - bodyR * 0.3, bodyR * 0.1, cx, bodyY, bodyR);
      if (state === "showoff") {
        bodyGrad.addColorStop(0, "hsla(300,100%,95%,0.95)");
        bodyGrad.addColorStop(0.4, "hsla(280,100%,75%,0.9)");
        bodyGrad.addColorStop(1, "hsla(260,100%,50%,0.85)");
      } else if (state === "thinking") {
        bodyGrad.addColorStop(0, "hsla(210,100%,90%,0.9)");
        bodyGrad.addColorStop(0.5, "hsla(220,100%,65%,0.85)");
        bodyGrad.addColorStop(1, "hsla(240,100%,45%,0.8)");
      } else if (state === "listening") {
        bodyGrad.addColorStop(0, "hsla(180,100%,90%,0.9)");
        bodyGrad.addColorStop(0.5, "hsla(190,100%,65%,0.85)");
        bodyGrad.addColorStop(1, "hsla(210,100%,50%,0.8)");
      } else {
        bodyGrad.addColorStop(0, "hsla(270,80%,92%,0.88)");
        bodyGrad.addColorStop(0.5, "hsla(280,90%,68%,0.85)");
        bodyGrad.addColorStop(1, "hsla(260,100%,48%,0.8)");
      }

      ctx.beginPath();
      ctx.arc(cx, bodyY, bodyR, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Inner shimmer ring
      ctx.beginPath();
      ctx.arc(cx, bodyY, bodyR * 0.88, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Eyes ──────────────────────────────────────────────────────────────
      const eyeSpacing = bodyR * 0.38;
      const eyeY       = bodyY - bodyR * 0.12;
      const eyeR       = bodyR * 0.22;
      const blink      = Math.sin(t * 0.003) > 0.98 ? Math.max(0, (Math.sin(t * 0.003) - 0.98) * 50) : 0;

      for (let side = -1; side <= 1; side += 2) {
        const ex = cx + side * eyeSpacing;

        // Eye white (glowing)
        const eyeGlow = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, eyeR * 1.4);
        eyeGlow.addColorStop(0, "rgba(255,255,255,0.9)");
        eyeGlow.addColorStop(0.6, "rgba(200,180,255,0.6)");
        eyeGlow.addColorStop(1, "rgba(150,100,255,0)");
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeR * 1.4, eyeR * 1.4 * (1 - blink), 0, 0, Math.PI * 2);
        ctx.fillStyle = eyeGlow;
        ctx.fill();

        // Iris
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, eyeR, eyeR * (1 - blink * 0.9), 0, 0, Math.PI * 2);
        const irisHue = state === "thinking" ? 210 : state === "happy" ? 45 : state === "showoff" ? 300 : 270;
        ctx.fillStyle = `hsla(${irisHue},100%,60%,0.95)`;
        ctx.fill();

        // Pupil
        if (blink < 0.7) {
          ctx.beginPath();
          const lookX = state === "listening" ? side * 2 : 0;
          ctx.ellipse(ex + lookX, eyeY, eyeR * 0.42, eyeR * 0.42 * (1 - blink), 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(10,5,30,0.9)";
          ctx.fill();

          // Eye shine
          ctx.beginPath();
          ctx.arc(ex + eyeR * 0.18 + lookX, eyeY - eyeR * 0.18, eyeR * 0.14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fill();
        }
      }

      // ── Mouth ─────────────────────────────────────────────────────────────
      const mouthY = bodyY + bodyR * 0.35;
      const mouthW = bodyR * 0.45;
      ctx.beginPath();
      if (state === "happy" || state === "showoff") {
        ctx.arc(cx, mouthY - bodyR * 0.08, mouthW * 0.6, 0.2, Math.PI - 0.2);
      } else if (state === "thinking") {
        ctx.moveTo(cx - mouthW * 0.3, mouthY);
        ctx.quadraticCurveTo(cx, mouthY + Math.sin(t * 0.003) * 4, cx + mouthW * 0.3, mouthY);
      } else {
        ctx.arc(cx, mouthY - bodyR * 0.05, mouthW * 0.5, 0.4, Math.PI - 0.4);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();

      // ── Thinking orbit ────────────────────────────────────────────────────
      if (state === "thinking") {
        for (let i = 0; i < 3; i++) {
          const angle = t * 0.002 * (i % 2 === 0 ? 1 : -1) + (i * Math.PI * 2) / 3;
          const orbitR = bodyR * 1.3;
          const ox = cx + Math.cos(angle) * orbitR;
          const oy = bodyY + Math.sin(angle) * orbitR * 0.5;
          ctx.beginPath();
          ctx.arc(ox, oy, 3 + Math.sin(t * 0.003 + i) * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${210 + i * 30},100%,80%,0.8)`;
          ctx.fill();
        }
      }

      // ── Showoff ring ──────────────────────────────────────────────────────
      if (state === "showoff") {
        const ringAngle = t * 0.003;
        ctx.beginPath();
        ctx.ellipse(cx, bodyY, bodyR * 1.7, bodyR * 0.4, ringAngle, 0, Math.PI * 2);
        ctx.strokeStyle = "hsla(300,100%,80%,0.4)";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (Math.random() < 0.15) {
          const a = Math.random() * Math.PI * 2;
          spawnParticle(
            cx + Math.cos(a) * bodyR * 1.7,
            bodyY + Math.sin(a) * bodyR * 0.4,
            false
          );
        }
        // Burst particles on entry
        if (Math.random() < 0.08) spawnParticle(cx, bodyY, true);
      }

      // ── Listening ripples ─────────────────────────────────────────────────
      if (state === "listening") {
        for (let i = 0; i < 3; i++) {
          const rippleAge = ((t * 0.001 + i * 0.33) % 1);
          const rippleR   = bodyR * (1.2 + rippleAge * 1.2);
          ctx.beginPath();
          ctx.arc(cx, bodyY, rippleR, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(180,100%,70%,${(1 - rippleAge) * 0.3})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // ── Idle sparkle trail ────────────────────────────────────────────────
      if (state === "idle" && Math.random() < 0.06) {
        const angle = Math.random() * Math.PI * 2;
        const r = bodyR * (0.8 + Math.random() * 0.4);
        spawnParticle(cx + Math.cos(angle) * r, bodyY + Math.sin(angle) * r);
      }

      // ── Update + draw particles ───────────────────────────────────────────
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02;
        p.life -= 0.016 / p.maxLife;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},100%,80%,${p.life * 0.9})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(drawFrame);
    }

    animRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [state, size]);

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ filter: "drop-shadow(0 0 20px rgba(150,80,255,0.4))" }}
      />
      {displayMsg && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 px-4 py-2 rounded-2xl text-sm text-white text-center max-w-xs"
          style={{
            background: "rgba(20,10,40,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(150,80,255,0.3)",
            boxShadow: "0 4px 24px rgba(120,60,255,0.2)",
            animation: "fadeInUp 0.3s ease",
          }}
        >
          {displayMsg}
        </div>
      )}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(calc(100% + 8px)); }
          to   { opacity: 1; transform: translateX(-50%) translateY(100%); }
        }
      `}</style>
    </div>
  );
}
