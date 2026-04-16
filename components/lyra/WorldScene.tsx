"use client";

import { useEffect, useRef } from "react";

// ── Cinematic fantasy world scene — always visible above chat ─────────────────
// Rendered with Canvas 2D for smooth, GPU-accelerated layered animation.

interface Particle { x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string; life: number; maxLife: number; }
interface Orb { x: number; y: number; vy: number; size: number; color: string; phase: number; speed: number; }

const COLORS = {
  sky1: "#04000f",
  sky2: "#0d0030",
  sky3: "#1a0050",
  aurora1: "rgba(80,200,160,",
  aurora2: "rgba(120,80,220,",
  aurora3: "rgba(200,80,160,",
  mist: "rgba(140,100,200,",
  ground: "#0a001e",
  mountain1: "#0a0020",
  mountain2: "#12003a",
  mountain3: "#1c0050",
  islandTop: "#150040",
  islandGlow: "rgba(120,60,220,",
  bookGlow: "rgba(200,160,255,",
  firefly: ["rgba(200,255,180,", "rgba(255,220,100,", "rgba(180,140,255,", "rgba(100,220,255,"],
};

export function WorldScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    // Resize
    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // ── Stars ────────────────────────────────────────────────────────────────
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.75,
      r: 0.3 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.8,
    }));

    // ── Fireflies ─────────────────────────────────────────────────────────────
    const fireflies: Orb[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * W(),
      y: H() * (0.3 + Math.random() * 0.5),
      vy: -(0.1 + Math.random() * 0.25),
      size: 1.5 + Math.random() * 2.5,
      color: COLORS.firefly[Math.floor(Math.random() * COLORS.firefly.length)],
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
    }));

    // ── Mountain path generators ──────────────────────────────────────────────
    function mountainPath(ctx: CanvasRenderingContext2D, w: number, h: number, peaks: [number, number][], baseY: number) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, peaks[0][1] * h);
      for (let i = 0; i < peaks.length; i++) {
        const [px, py] = peaks[i];
        const nx = i < peaks.length - 1 ? peaks[i + 1][0] : 1;
        const ny = i < peaks.length - 1 ? peaks[i + 1][1] * h : baseY * h;
        const cpx = (px * w + nx * w) / 2;
        ctx.quadraticCurveTo(px * w, py * h, cpx, (py * h + ny) / 2);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
    }

    // Mountain layers: [x_fraction, y_fraction] of peaks
    const mtn1: [number, number][] = [
      [0, 0.82], [0.08, 0.58], [0.18, 0.72], [0.28, 0.42], [0.38, 0.65],
      [0.48, 0.38], [0.58, 0.55], [0.68, 0.35], [0.78, 0.62], [0.88, 0.45], [1, 0.75],
    ];
    const mtn2: [number, number][] = [
      [0, 0.9], [0.1, 0.65], [0.22, 0.78], [0.33, 0.55], [0.45, 0.72],
      [0.55, 0.48], [0.65, 0.68], [0.75, 0.52], [0.85, 0.75], [1, 0.8],
    ];
    const mtn3: [number, number][] = [
      [0, 0.95], [0.15, 0.75], [0.3, 0.88], [0.5, 0.72], [0.7, 0.85], [0.9, 0.78], [1, 0.9],
    ];

    // ── Aurora ────────────────────────────────────────────────────────────────
    function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const bands = [
        { color: COLORS.aurora1, y: 0.18, amp: 0.06, freq: 1.2, speed: 0.0004, alpha: 0.18 },
        { color: COLORS.aurora2, y: 0.24, amp: 0.05, freq: 0.9, speed: 0.0006, alpha: 0.14 },
        { color: COLORS.aurora3, y: 0.14, amp: 0.04, freq: 1.5, speed: 0.0003, alpha: 0.10 },
      ];
      for (const band of bands) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.0008 + band.freq * 10);
        const alpha = band.alpha * pulse;
        const grad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
        grad.addColorStop(0, `${band.color}0)`);
        grad.addColorStop(0.3, `${band.color}${alpha})`);
        grad.addColorStop(0.7, `${band.color}${alpha * 0.5})`);
        grad.addColorStop(1, `${band.color}0)`);
        ctx.save();
        ctx.beginPath();
        const centerY = h * (band.y + band.amp * Math.sin(t * band.speed));
        for (let x = 0; x <= w; x += 4) {
          const y = centerY + h * band.amp * Math.sin(x / w * Math.PI * band.freq * 2 + t * band.speed * 3);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(w, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Floating island ────────────────────────────────────────────────────────
    function drawIsland(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const ix = w * 0.75;
      const iy = h * 0.3 + Math.sin(t * 0.0005) * 4;
      const iw = w * 0.14;
      const ih = h * 0.09;

      // Glow under island
      const glowR = ctx.createRadialGradient(ix, iy + ih * 0.6, 0, ix, iy + ih * 0.6, iw * 0.9);
      glowR.addColorStop(0, `${COLORS.islandGlow}0.4)`);
      glowR.addColorStop(1, `${COLORS.islandGlow}0)`);
      ctx.fillStyle = glowR;
      ctx.beginPath();
      ctx.ellipse(ix, iy + ih * 0.6, iw * 0.9, ih * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Island body
      ctx.beginPath();
      ctx.ellipse(ix, iy, iw, ih * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.islandTop;
      ctx.fill();
      ctx.strokeStyle = "rgba(120,60,220,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bottom stalactites
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ix, iy, iw, ih * 0.28, 0, 0, Math.PI);
      ctx.clip();
      const grad = ctx.createLinearGradient(ix, iy, ix, iy + ih);
      grad.addColorStop(0, "#1a0050");
      grad.addColorStop(1, "#0a0020");
      ctx.fillStyle = grad;
      ctx.fillRect(ix - iw, iy, iw * 2, ih);
      ctx.restore();

      // Waterfall-like glow drips
      for (let d = 0; d < 3; d++) {
        const dx = ix + (d - 1) * iw * 0.3;
        const dy = iy + ih * 0.1;
        const len = ih * 0.6 + Math.sin(t * 0.001 + d) * ih * 0.1;
        const g = ctx.createLinearGradient(dx, dy, dx, dy + len);
        g.addColorStop(0, "rgba(140,80,255,0.5)");
        g.addColorStop(1, "rgba(140,80,255,0)");
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx + 1, dy + len);
        ctx.strokeStyle = "rgba(180,120,255,0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = g;
        ctx.fillRect(dx - 1, dy, 2, len);
      }

      // Tree silhouettes on top
      for (let tr = 0; tr < 5; tr++) {
        const tx = ix - iw * 0.6 + tr * iw * 0.3;
        const ty = iy - ih * 0.28;
        const th = ih * 0.35 + Math.random() * ih * 0.1;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - 4, ty + th);
        ctx.lineTo(tx + 4, ty + th);
        ctx.closePath();
        ctx.fillStyle = "rgba(10,0,25,0.9)";
        ctx.fill();
      }
    }

    // ── Stone gate / arch ─────────────────────────────────────────────────────
    function drawGate(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const gx = w * 0.5;
      const gy = h * 0.82;
      const gw = w * 0.09;
      const gh = h * 0.35;
      const pillarW = w * 0.018;

      // Gate glow
      const gateGlow = ctx.createRadialGradient(gx, gy - gh * 0.4, 0, gx, gy - gh * 0.4, gw * 1.4);
      const gAlpha = 0.15 + 0.08 * Math.sin(t * 0.001);
      gateGlow.addColorStop(0, `rgba(160,120,255,${gAlpha})`);
      gateGlow.addColorStop(1, "rgba(100,60,200,0)");
      ctx.fillStyle = gateGlow;
      ctx.fillRect(gx - gw * 1.5, gy - gh * 0.9, gw * 3, gh * 1.1);

      // Left pillar
      const pillarGrad = ctx.createLinearGradient(gx - gw - pillarW, 0, gx - gw + pillarW, 0);
      pillarGrad.addColorStop(0, "#1a0040");
      pillarGrad.addColorStop(0.4, "#2d0060");
      pillarGrad.addColorStop(1, "#0d0020");
      ctx.fillStyle = pillarGrad;
      ctx.fillRect(gx - gw - pillarW, gy - gh, pillarW * 2, gh);

      // Right pillar
      const pillarGrad2 = ctx.createLinearGradient(gx + gw - pillarW, 0, gx + gw + pillarW, 0);
      pillarGrad2.addColorStop(0, "#0d0020");
      pillarGrad2.addColorStop(0.6, "#2d0060");
      pillarGrad2.addColorStop(1, "#1a0040");
      ctx.fillStyle = pillarGrad2;
      ctx.fillRect(gx + gw - pillarW, gy - gh, pillarW * 2, gh);

      // Arch
      ctx.beginPath();
      ctx.arc(gx, gy - gh, gw + pillarW, Math.PI, 0);
      ctx.lineWidth = pillarW * 1.2;
      ctx.strokeStyle = "#2d0060";
      ctx.stroke();

      // Arch glow edge
      ctx.beginPath();
      ctx.arc(gx, gy - gh, gw + pillarW * 0.5, Math.PI, 0);
      ctx.lineWidth = 1.5;
      const archAlpha = 0.3 + 0.2 * Math.sin(t * 0.0012);
      ctx.strokeStyle = `rgba(180,120,255,${archAlpha})`;
      ctx.stroke();

      // Portal inside gate
      const portalH = gh * 0.85;
      const portalW = gw * 0.85;
      const pg = ctx.createRadialGradient(gx, gy - gh * 0.45, 0, gx, gy - gh * 0.45, portalW);
      const pAlpha = 0.7 + 0.15 * Math.sin(t * 0.0009);
      pg.addColorStop(0, `rgba(20,0,50,${pAlpha})`);
      pg.addColorStop(0.5, `rgba(10,0,35,${pAlpha * 0.9})`);
      pg.addColorStop(1, "rgba(5,0,15,0)");
      ctx.beginPath();
      ctx.ellipse(gx, gy - gh * 0.45, portalW, portalH * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();

      // Rune marks on pillars
      ctx.font = "bold 8px serif";
      ctx.textAlign = "center";
      const runeAlpha = 0.3 + 0.2 * Math.sin(t * 0.0015);
      ctx.fillStyle = `rgba(180,140,255,${runeAlpha})`;
      const runes = ["ᚠ", "ᚦ", "ᚱ", "ᚲ", "ᚷ", "ᚹ"];
      for (let r = 0; r < 3; r++) {
        ctx.fillText(runes[r], gx - gw - pillarW * 0.5, gy - gh * 0.2 - r * gh * 0.22);
        ctx.fillText(runes[r + 3], gx + gw + pillarW * 0.5, gy - gh * 0.2 - r * gh * 0.22);
      }
    }

    // ── Book on altar ─────────────────────────────────────────────────────────
    function drawBook(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const bx = w * 0.5;
      const by = h * 0.84;
      const bw = w * 0.032;
      const bh = h * 0.045;

      // Altar
      ctx.fillStyle = "#1a0040";
      ctx.beginPath();
      ctx.ellipse(bx, by + bh * 0.6, bw * 1.8, bh * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Book glow
      const glowPulse = 0.6 + 0.4 * Math.sin(t * 0.0012);
      const bglow = ctx.createRadialGradient(bx, by, 0, bx, by, bw * 2.5);
      bglow.addColorStop(0, `rgba(210,170,255,${0.35 * glowPulse})`);
      bglow.addColorStop(0.5, `rgba(160,100,255,${0.2 * glowPulse})`);
      bglow.addColorStop(1, "rgba(100,60,200,0)");
      ctx.fillStyle = bglow;
      ctx.fillRect(bx - bw * 3, by - bh * 2, bw * 6, bh * 4);

      // Book pages (open)
      ctx.save();
      // Left page
      ctx.beginPath();
      ctx.moveTo(bx, by - bh * 0.1);
      ctx.lineTo(bx - bw, by - bh);
      ctx.lineTo(bx - bw * 0.6, by - bh * 1.3);
      ctx.lineTo(bx, by - bh * 0.3);
      ctx.closePath();
      ctx.fillStyle = `rgba(240,230,210,${0.7 + 0.1 * glowPulse})`;
      ctx.fill();

      // Right page
      ctx.beginPath();
      ctx.moveTo(bx, by - bh * 0.1);
      ctx.lineTo(bx + bw, by - bh);
      ctx.lineTo(bx + bw * 0.6, by - bh * 1.3);
      ctx.lineTo(bx, by - bh * 0.3);
      ctx.closePath();
      ctx.fillStyle = `rgba(230,220,200,${0.65 + 0.1 * glowPulse})`;
      ctx.fill();

      // Page glow from inside
      const pageGlow = ctx.createRadialGradient(bx, by - bh * 0.7, 0, bx, by - bh * 0.7, bw * 0.8);
      pageGlow.addColorStop(0, `rgba(220,180,255,${0.5 * glowPulse})`);
      pageGlow.addColorStop(1, "rgba(180,120,255,0)");
      ctx.fillStyle = pageGlow;
      ctx.fillRect(bx - bw, by - bh * 1.4, bw * 2, bh * 1.2);

      // Spine
      ctx.beginPath();
      ctx.moveTo(bx, by - bh * 0.1);
      ctx.lineTo(bx, by - bh * 0.3);
      ctx.strokeStyle = `rgba(100,60,160,0.8)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Light beam from book upward
      const beam = ctx.createLinearGradient(bx, by - bh, bx, by - h * 0.35);
      beam.addColorStop(0, `rgba(200,160,255,${0.12 * glowPulse})`);
      beam.addColorStop(1, "rgba(200,160,255,0)");
      ctx.beginPath();
      ctx.moveTo(bx - bw * 0.3, by - bh);
      ctx.lineTo(bx + bw * 0.3, by - bh);
      ctx.lineTo(bx + bw * 3, by - h * 0.35);
      ctx.lineTo(bx - bw * 3, by - h * 0.35);
      ctx.closePath();
      ctx.fillStyle = beam;
      ctx.fill();
    }

    // ── Ground mist ───────────────────────────────────────────────────────────
    function drawMist(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      for (let i = 0; i < 4; i++) {
        const offset = (t * 0.00015 * (i % 2 === 0 ? 1 : -1) + i * 0.3) % 1;
        const mx = (offset * w * 1.5 - w * 0.25) % (w * 1.5) - w * 0.25;
        const my = h * (0.72 + i * 0.06);
        const mAlpha = 0.06 + 0.02 * Math.sin(t * 0.0004 + i);
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, w * 0.4);
        mg.addColorStop(0, `${COLORS.mist}${mAlpha})`);
        mg.addColorStop(1, `${COLORS.mist}0)`);
        ctx.fillStyle = mg;
        ctx.fillRect(mx - w * 0.4, my - h * 0.04, w * 0.8, h * 0.1);
      }
    }

    // ── Fireflies update & draw ───────────────────────────────────────────────
    function updateFireflies(w: number, h: number) {
      for (const f of fireflies) {
        f.x += Math.sin(tRef.current * 0.0008 + f.phase) * 0.4;
        f.y += f.vy;
        if (f.y < h * 0.1) {
          f.y = h * (0.7 + Math.random() * 0.2);
          f.x = Math.random() * w;
        }
      }
    }

    function drawFireflies(ctx: CanvasRenderingContext2D, t: number) {
      for (const f of fireflies) {
        const alpha = (0.5 + 0.5 * Math.sin(t * 0.002 * f.speed + f.phase));
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 3);
        glow.addColorStop(0, `${f.color}${alpha})`);
        glow.addColorStop(1, `${f.color}0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `${f.color}${Math.min(1, alpha * 1.5)})`;
        ctx.fill();
      }
    }

    // ── Main render loop ──────────────────────────────────────────────────────
    function render() {
      const t = tRef.current;
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);

      // 1. Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, COLORS.sky1);
      sky.addColorStop(0.4, COLORS.sky2);
      sky.addColorStop(1, COLORS.sky3);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // 2. Stars
      for (const s of stars) {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.0005 * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      // 3. Aurora
      drawAurora(ctx, w, h, t);

      // 4. Mountains (far → near)
      ctx.fillStyle = COLORS.mountain1;
      mountainPath(ctx, w, h, mtn1, 1);
      ctx.fill();

      ctx.fillStyle = COLORS.mountain2;
      mountainPath(ctx, w, h, mtn2, 1);
      ctx.fill();

      ctx.fillStyle = COLORS.mountain3;
      mountainPath(ctx, w, h, mtn3, 1);
      ctx.fill();

      // 5. Floating island
      drawIsland(ctx, w, h, t);

      // 6. Ground
      const groundGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
      groundGrad.addColorStop(0, "rgba(10,0,30,0)");
      groundGrad.addColorStop(0.3, COLORS.ground);
      groundGrad.addColorStop(1, "#000010");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.7, w, h * 0.3);

      // 7. Mist
      drawMist(ctx, w, h, t);

      // 8. Stone gate
      drawGate(ctx, w, h, t);

      // 9. Book
      drawBook(ctx, w, h, t);

      // 10. Fireflies
      updateFireflies(w, h);
      drawFireflies(ctx, t);

      // 11. Top & bottom edge vignette
      const topVig = ctx.createLinearGradient(0, 0, 0, h * 0.15);
      topVig.addColorStop(0, "rgba(0,0,0,0.5)");
      topVig.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topVig;
      ctx.fillRect(0, 0, w, h * 0.15);

      const botVig = ctx.createLinearGradient(0, h * 0.82, 0, h);
      botVig.addColorStop(0, "rgba(0,0,0,0)");
      botVig.addColorStop(1, "rgba(0,0,8,0.95)");
      ctx.fillStyle = botVig;
      ctx.fillRect(0, h * 0.82, w, h * 0.18);

      tRef.current += 16;
      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", flexShrink: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: 220,
          borderBottom: "1px solid rgba(100,50,180,0.2)",
        }}
      />
      {/* Scene title overlay — subtle, cinematic */}
      <div style={{
        position: "absolute",
        bottom: 10,
        right: 14,
        fontSize: 9,
        letterSpacing: 2.5,
        textTransform: "uppercase",
        color: "rgba(180,140,255,0.25)",
        fontFamily: "serif",
        pointerEvents: "none",
        userSelect: "none",
      }}>
        The Grimoire World
      </div>
    </div>
  );
}
