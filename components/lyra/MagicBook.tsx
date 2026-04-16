"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

// ── Particle ──────────────────────────────────────────────────────────────────
function Particle({ delay, x, size, color }: { delay: number; x: number; size: number; color: string }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        bottom: "10%",
        left: `${x}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        pointerEvents: "none",
      }}
      initial={{ y: 0, opacity: 0, scale: 0 }}
      animate={{
        y: [-0, -120 - Math.random() * 80],
        opacity: [0, 0.9, 0],
        scale: [0, 1, 0.3],
        x: [(Math.random() - 0.5) * 30],
      }}
      transition={{
        delay,
        duration: 2.2 + Math.random(),
        repeat: Infinity,
        repeatDelay: 1.5 + Math.random() * 2,
        ease: "easeOut",
      }}
    />
  );
}

// ── Rune ──────────────────────────────────────────────────────────────────────
const RUNES = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ"];

function FloatingRune({ delay, x, y }: { delay: number; x: number; y: number }) {
  const rune = RUNES[Math.floor(Math.random() * RUNES.length)];
  return (
    <motion.span
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        color: `rgba(167, 139, 250, ${0.3 + Math.random() * 0.5})`,
        fontSize: 10 + Math.random() * 8,
        fontFamily: "serif",
        pointerEvents: "none",
        userSelect: "none",
      }}
      initial={{ opacity: 0, y: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        y: [-10, -40],
        rotate: [(Math.random() - 0.5) * 20],
      }}
      transition={{
        delay,
        duration: 3 + Math.random(),
        repeat: Infinity,
        repeatDelay: 2 + Math.random() * 3,
        ease: "easeOut",
      }}
    >
      {rune}
    </motion.span>
  );
}

// ── Star field ────────────────────────────────────────────────────────────────
function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 0.5 + Math.random() * 1.5,
    delay: Math.random() * 3,
  }));
  return (
    <>
      {stars.map((s) => (
        <motion.div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "white",
            pointerEvents: "none",
          }}
          animate={{ opacity: [0.1, 1, 0.1] }}
          transition={{ delay: s.delay, duration: 2 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

// ── Portal swirl ──────────────────────────────────────────────────────────────
function PortalSwirl() {
  return (
    <motion.div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: "conic-gradient(from 0deg, rgba(139,92,246,0.4), rgba(30,27,75,0.1), rgba(217,70,239,0.3), rgba(30,27,75,0.1), rgba(139,92,246,0.4))",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
  );
}

// ── Main MagicBook ────────────────────────────────────────────────────────────

interface MagicBookProps {
  /** Auto-open when a magic keyword is detected in the latest message */
  triggerText?: string;
  /** Whether to show the component at all */
  visible?: boolean;
}

export function MagicBook({ triggerText, visible = true }: MagicBookProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bookControls = useAnimation();
  const prevTrigger = useRef("");

  // Auto-open on magic keywords
  useEffect(() => {
    if (!triggerText || triggerText === prevTrigger.current) return;
    prevTrigger.current = triggerText;
    const magic = /\b(book|story|magic|grimoire|spell|enchant|portal|world|realm|tale|legend|witch|wizard|sorcerer|write a book|ancient|mystical|rune)\b/i.test(triggerText);
    if (magic && !open) {
      setOpen(true);
      setExpanded(true);
    }
  }, [triggerText, open]);

  // Ambient idle shimmer on the book
  useEffect(() => {
    bookControls.start({
      y: [0, -6, 0],
      rotateZ: [-0.5, 0.5, -0.5],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
    });
  }, [bookControls]);

  if (!visible) return null;

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: 15 + (i / 12) * 70,
    delay: i * 0.18,
    size: 3 + Math.random() * 4,
    color: i % 3 === 0
      ? "rgba(167,139,250,0.9)"
      : i % 3 === 1
      ? "rgba(217,70,239,0.8)"
      : "rgba(251,191,36,0.85)",
  }));

  const runes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 5 + (i / 8) * 90,
    y: 20 + Math.random() * 60,
    delay: i * 0.4,
  }));

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: open ? 0 : 8 }}>
      {/* ── Collapsed: just a glowing spine on the edge ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => { setOpen(true); setExpanded(true); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "0 auto 8px",
              padding: "6px 14px",
              borderRadius: 20,
              background: "rgba(88, 28, 135, 0.25)",
              border: "1px solid rgba(139,92,246,0.35)",
              cursor: "pointer",
              color: "rgba(196,181,253,0.8)",
              fontSize: 12,
              boxShadow: "0 0 20px rgba(139,92,246,0.15)",
            }}
          >
            <motion.span
              style={{ fontSize: 16 }}
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              📖
            </motion.span>
            <span>Open the grimoire</span>
            <motion.span
              style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(167,139,250,0.8)", boxShadow: "0 0 8px rgba(167,139,250,0.8)" }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Open: full 3D world ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="world"
            initial={{ opacity: 0, scaleY: 0, originY: 1 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0, originY: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative", overflow: "hidden" }}
          >
            {/* ── The 3D scene container ── */}
            <div
              style={{
                width: "100%",
                height: expanded ? 260 : 180,
                position: "relative",
                perspective: "900px",
                perspectiveOrigin: "50% 40%",
                transition: "height 0.4s ease",
              }}
            >
              {/* ── Ground plane ── */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transformStyle: "preserve-3d",
                  transform: "rotateX(18deg)",
                }}
              >
                {/* Sky / void background */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at 50% 70%, rgba(30,0,60,0.95) 0%, rgba(5,0,20,0.98) 60%, #000 100%)",
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  {/* Stars */}
                  <StarField />

                  {/* Nebula glow */}
                  <div style={{
                    position: "absolute",
                    top: "10%",
                    left: "20%",
                    width: "60%",
                    height: "50%",
                    background: "radial-gradient(ellipse, rgba(88,28,135,0.3) 0%, transparent 70%)",
                    filter: "blur(20px)",
                    pointerEvents: "none",
                  }} />
                  <div style={{
                    position: "absolute",
                    top: "20%",
                    right: "10%",
                    width: "40%",
                    height: "40%",
                    background: "radial-gradient(ellipse, rgba(217,70,239,0.15) 0%, transparent 70%)",
                    filter: "blur(16px)",
                    pointerEvents: "none",
                  }} />

                  {/* Ground horizon glow */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "35%",
                    background: "linear-gradient(to top, rgba(88,28,135,0.6), transparent)",
                    pointerEvents: "none",
                  }} />

                  {/* Floating runes */}
                  {runes.map((r) => (
                    <FloatingRune key={r.id} x={r.x} y={r.y} delay={r.delay} />
                  ))}

                  {/* Particles rising from book */}
                  {open && particles.map((p) => (
                    <Particle key={p.id} x={p.x} delay={p.delay} size={p.size} color={p.color} />
                  ))}
                </div>

                {/* ── The Book ── */}
                <motion.div
                  animate={bookControls}
                  style={{
                    position: "absolute",
                    bottom: "14%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 110,
                    height: 90,
                    transformStyle: "preserve-3d",
                    cursor: "pointer",
                    filter: "drop-shadow(0 0 24px rgba(139,92,246,0.7))",
                    zIndex: 10,
                  }}
                  onClick={() => setExpanded((v) => !v)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* ── Book back cover (always visible as base) ── */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "4px 12px 12px 4px",
                    background: "linear-gradient(135deg, #1e0a3c, #0f0520)",
                    border: "1px solid rgba(139,92,246,0.5)",
                    transformOrigin: "left center",
                  }} />

                  {/* ── Pages block ── */}
                  <div style={{
                    position: "absolute",
                    top: 2,
                    left: 6,
                    right: 2,
                    bottom: 2,
                    background: "linear-gradient(90deg, #e8d5b7, #f5e6cc, #ede0c4)",
                    borderRadius: "0 10px 10px 0",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {/* Portal revealed inside pages when open */}
                    <motion.div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: "50%",
                        overflow: "hidden",
                        position: "relative",
                        boxShadow: "0 0 20px rgba(139,92,246,0.9), inset 0 0 20px rgba(0,0,0,0.8)",
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: expanded ? 1 : 0, opacity: expanded ? 1 : 0 }}
                      transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "radial-gradient(circle at 50% 50%, #0a001a, #1a0033, #0d0025)",
                      }} />
                      <PortalSwirl />
                      {/* Mini stars inside portal */}
                      {Array.from({ length: 20 }, (_, i) => (
                        <motion.div
                          key={i}
                          style={{
                            position: "absolute",
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: 1.5,
                            height: 1.5,
                            borderRadius: "50%",
                            background: "white",
                          }}
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ delay: Math.random() * 2, duration: 1 + Math.random(), repeat: Infinity }}
                        />
                      ))}
                    </motion.div>

                    {/* Closed pages texture lines */}
                    {!expanded && Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: 4,
                          right: 4,
                          height: 1,
                          top: `${18 + i * 9}%`,
                          background: "rgba(100,80,50,0.2)",
                        }}
                      />
                    ))}
                  </div>

                  {/* ── Front cover (opens to the left) ── */}
                  <motion.div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "4px 12px 12px 4px",
                      background: "linear-gradient(135deg, #2d0a5e, #1a0540, #0f0325)",
                      border: "1px solid rgba(139,92,246,0.6)",
                      transformOrigin: "left center",
                      transformStyle: "preserve-3d",
                      boxShadow: "-4px 0 12px rgba(0,0,0,0.5)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      overflow: "hidden",
                    }}
                    animate={{ rotateY: expanded ? -145 : 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Cover decoration */}
                    <div style={{
                      position: "absolute",
                      inset: 4,
                      border: "1px solid rgba(167,139,250,0.3)",
                      borderRadius: 8,
                      pointerEvents: "none",
                    }} />
                    <motion.div
                      style={{ fontSize: 22, filter: "drop-shadow(0 0 6px rgba(167,139,250,0.8))" }}
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      ✦
                    </motion.div>
                    <div style={{
                      fontSize: 7,
                      color: "rgba(196,181,253,0.7)",
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      fontFamily: "serif",
                      textAlign: "center",
                      padding: "0 6px",
                    }}>
                      Grimoire
                    </div>
                    <div style={{ fontSize: 14 }}>📖</div>
                    {/* Cover glow pulse */}
                    <motion.div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.15), transparent)",
                        borderRadius: 8,
                      }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>

                  {/* ── Spine ── */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 8,
                    bottom: 0,
                    background: "linear-gradient(180deg, #3b0a6e, #1a0540, #3b0a6e)",
                    borderRadius: "4px 0 0 4px",
                    boxShadow: "inset -2px 0 4px rgba(0,0,0,0.5)",
                  }} />
                </motion.div>

                {/* ── Ground surface glow under book ── */}
                <motion.div
                  style={{
                    position: "absolute",
                    bottom: "8%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 100,
                    height: 16,
                    background: "radial-gradient(ellipse, rgba(139,92,246,0.5), transparent 70%)",
                    filter: "blur(6px)",
                    pointerEvents: "none",
                  }}
                  animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* ── Floating orbs ── */}
                {[
                  { x: "18%", y: "25%", size: 14, color: "rgba(139,92,246,0.6)", delay: 0 },
                  { x: "75%", y: "30%", size: 10, color: "rgba(217,70,239,0.5)", delay: 0.7 },
                  { x: "12%", y: "55%", size: 8,  color: "rgba(251,191,36,0.5)",  delay: 1.2 },
                  { x: "82%", y: "58%", size: 12, color: "rgba(99,102,241,0.5)",  delay: 0.4 },
                ].map((orb, i) => (
                  <motion.div
                    key={i}
                    style={{
                      position: "absolute",
                      left: orb.x,
                      top: orb.y,
                      width: orb.size,
                      height: orb.size,
                      borderRadius: "50%",
                      background: orb.color,
                      boxShadow: `0 0 ${orb.size * 2}px ${orb.color}`,
                      pointerEvents: "none",
                    }}
                    animate={{
                      y: [-6, 6, -6],
                      opacity: [0.5, 1, 0.5],
                      scale: [0.9, 1.1, 0.9],
                    }}
                    transition={{
                      delay: orb.delay,
                      duration: 3 + i * 0.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ── Close button ── */}
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <button
                onClick={() => { setOpen(false); setExpanded(false); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(139,92,246,0.5)",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "2px 8px",
                  letterSpacing: 0.5,
                }}
              >
                close ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
