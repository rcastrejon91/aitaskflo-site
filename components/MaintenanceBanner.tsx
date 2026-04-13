"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AlertTriangle, RefreshCw } from "lucide-react";

const POLL_INTERVAL = 20_000; // check every 20s
const FAIL_THRESHOLD = 2;     // show banner after 2 consecutive failures

export default function MaintenanceBanner() {
  const staticMsg = process.env.NEXT_PUBLIC_MAINTENANCE_BANNER ?? "";
  const [dismissed, setDismissed] = useState(false);
  const [autoMsg, setAutoMsg] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [recovering, setRecovering] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(5_000) });
      if (res.ok) {
        if (failCount >= FAIL_THRESHOLD) {
          setRecovering(true);
          setTimeout(() => {
            setAutoMsg("");
            setRecovering(false);
            setFailCount(0);
          }, 3000);
        } else {
          setFailCount(0);
          setAutoMsg("");
        }
      } else {
        throw new Error("not ok");
      }
    } catch {
      setFailCount((n) => {
        const next = n + 1;
        if (next >= FAIL_THRESHOLD) {
          setAutoMsg("Updating — server may be briefly unavailable.");
          setDismissed(false);
        }
        return next;
      });
    }
  }, [failCount]);

  useEffect(() => {
    const id = setInterval(checkHealth, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [checkHealth]);

  const message = recovering
    ? "Back online."
    : staticMsg || autoMsg;

  if (!message || dismissed) return null;

  const isRecovering = recovering;
  const isStatic = !!staticMsg && !recovering;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium"
      style={{
        background: isRecovering
          ? "rgba(16,185,129,0.15)"
          : isStatic
          ? "rgba(109,40,217,0.2)"
          : "rgba(234,179,8,0.12)",
        borderBottom: isRecovering
          ? "1px solid rgba(16,185,129,0.3)"
          : isStatic
          ? "1px solid rgba(109,40,217,0.35)"
          : "1px solid rgba(234,179,8,0.3)",
        backdropFilter: "blur(12px)",
      }}
    >
      {isRecovering ? (
        <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
      ) : (
        <AlertTriangle
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: isStatic ? "rgb(196,181,253)" : "rgb(234,179,8)" }}
        />
      )}

      <span style={{ color: isRecovering ? "rgb(110,231,183)" : isStatic ? "rgb(221,214,254)" : "rgb(253,230,138)" }}>
        {message}
      </span>

      {!isRecovering && (
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: isStatic ? "rgb(196,181,253)" : "rgb(234,179,8)" }}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
