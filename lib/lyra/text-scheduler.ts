// Self-contained text scheduler — runs inside the Next.js process.
// Fires once per hour, checks if a text slot is due, sends it.
// Started automatically on first chat API call.

import { TIME_SLOTS, sendDailyText } from "./daily-texts";
import { acquireCronLock, releaseCronLock, checkSpendAllowed, recordSpend } from "./governance";
import { generateDropsForAllUsers } from "./drops";

let started = false;
const sentToday = new Set<string>();
let dropsGeneratedToday = false;

const DROPS_HOUR = 6; // Generate drops at 6am daily

function resetAtMidnight() {
  const now = new Date();
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
  setTimeout(() => {
    sentToday.clear();
    dropsGeneratedToday = false;
    resetAtMidnight();
  }, msUntilMidnight);
}

async function tick() {
  const lockName = "text-scheduler-tick";
  if (!acquireCronLock(lockName, 25 * 60 * 1000)) return; // 25-min TTL, matches interval

  try {
    const hour = new Date().getHours();

    // ── Daily drops generation (6am) ────────────────────────────────────────
    if (hour >= DROPS_HOUR && !dropsGeneratedToday) {
      dropsGeneratedToday = true;
      const dropLock = "drops-daily-gen";
      if (acquireCronLock(dropLock, 30 * 60 * 1000)) {
        generateDropsForAllUsers()
          .catch(() => {})
          .finally(() => releaseCronLock(dropLock));
      }
    }

    // ── Daily texts ──────────────────────────────────────────────────────────
    for (const slot of TIME_SLOTS) {
      if (sentToday.has(slot.slot)) continue;
      if (Math.abs(slot.hour - hour) <= 0) {
        const spend = checkSpendAllowed(0.02);
        if (!spend.allowed) break;
        sentToday.add(slot.slot);
        await sendDailyText(slot.slot).catch(() => {});
        recordSpend("twilio", 0.01, `daily-text-${slot.slot}`, true);
        recordSpend("anthropic", 0.005, `daily-text-${slot.slot}`, true);
        break;
      }
    }
  } finally {
    releaseCronLock(lockName);
  }
}

export function startTextScheduler() {
  if (started || process.env.NODE_ENV !== "production") return;
  if (!process.env.ADMIN_PHONE || !process.env.TWILIO_ACCOUNT_SID) return;
  started = true;
  resetAtMidnight();
  // Check every 30 minutes
  setInterval(tick, 30 * 60 * 1000);
  tick(); // run immediately on start
}
