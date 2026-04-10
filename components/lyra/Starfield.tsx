"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;        // depth 0–1 (0 = far, 1 = near)
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  life: number;     // 0–1
}

const STAR_COUNT = 220;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function Starfield({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let stars: Star[] = [];
    let shooters: Shooter[] = [];
    let t = 0;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      init();
    }

    function init() {
      if (!canvas) return;
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: rand(0, canvas!.width),
        y: rand(0, canvas!.height),
        z: rand(0, 1),
        size: 0,
        opacity: 0,
        twinkleSpeed: rand(0.4, 1.8),
        twinkleOffset: rand(0, Math.PI * 2),
      })).map((s) => ({
        ...s,
        size: 0.3 + s.z * 1.8,
        opacity: 0.15 + s.z * 0.65,
      }));
    }

    function spawnShooter() {
      if (!canvas) return;
      // start from top edge or left edge
      const fromTop = Math.random() > 0.4;
      const x = fromTop ? rand(0, canvas.width) : -20;
      const y = fromTop ? -10 : rand(0, canvas.height * 0.5);
      const angle = rand(25, 55) * (Math.PI / 180);
      const speed = rand(5, 10);
      shooters.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: rand(80, 160),
        opacity: rand(0.5, 0.9),
        life: 1,
      });
    }

    function draw() {
      if (!canvas || !ctx) return;
      t += 0.016;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stars
      for (const s of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
        const alpha = s.opacity * (0.6 + 0.4 * twinkle);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (0.85 + 0.15 * twinkle), 0, Math.PI * 2);

        // Near stars get a soft glow
        if (s.z > 0.7) {
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3);
          grd.addColorStop(0, `rgba(200,180,255,${alpha})`);
          grd.addColorStop(0.4, `rgba(180,160,255,${alpha * 0.4})`);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grd;
          ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = `rgba(210,200,255,${alpha})`;
        }

        ctx.fill();
      }

      // Shooting stars
      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= 0.018;

        if (sh.life <= 0 || sh.x > canvas.width + 50 || sh.y > canvas.height + 50) {
          shooters.splice(i, 1);
          continue;
        }

        const alpha = sh.opacity * sh.life;
        const tailX = sh.x - (sh.vx / Math.hypot(sh.vx, sh.vy)) * sh.length;
        const tailY = sh.y - (sh.vy / Math.hypot(sh.vx, sh.vy)) * sh.length;

        const grd = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
        grd.addColorStop(0, `rgba(200,180,255,0)`);
        grd.addColorStop(0.7, `rgba(220,200,255,${alpha * 0.4})`);
        grd.addColorStop(1, `rgba(255,255,255,${alpha})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(sh.x, sh.y);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Head glow
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    // Spawn a shooter every 3–7 seconds
    let shooterTimer: ReturnType<typeof setTimeout>;
    function scheduleShooter() {
      const delay = rand(3000, 7000);
      shooterTimer = setTimeout(() => {
        spawnShooter();
        scheduleShooter();
      }, delay);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    draw();
    scheduleShooter();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(shooterTimer);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
