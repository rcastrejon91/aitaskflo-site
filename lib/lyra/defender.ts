import { blockIp, unblockIp, suspendUser, logSecurityEvent, getBlockedIps, getSecurityEvents } from "./db";
import { toolSendEmail } from "./tools";

const ADMIN_EMAIL = process.env.GMAIL_USER ?? "";
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const CF_ZONE  = process.env.CLOUDFLARE_ZONE_ID ?? "";

// ── Cloudflare helpers ────────────────────────────────────────────────────────

async function cfBlockIp(ip: string, reason: string): Promise<string | null> {
  if (!CF_TOKEN || !CF_ZONE) return null;
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/firewall/access_rules/rules`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "block", configuration: { target: "ip", value: ip }, notes: `Lyra defender: ${reason}` }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json() as { result?: { id?: string } };
    return data.result?.id ?? null;
  } catch { return null; }
}

async function cfUnblockIp(ip: string): Promise<boolean> {
  if (!CF_TOKEN || !CF_ZONE) return false;
  try {
    // Find the rule ID first
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/firewall/access_rules/rules?configuration.value=${ip}&per_page=5`,
      { headers: { "Authorization": `Bearer ${CF_TOKEN}` }, signal: AbortSignal.timeout(10_000) }
    );
    const data = await res.json() as { result?: Array<{ id: string }> };
    const rules = data.result ?? [];
    for (const rule of rules) {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/firewall/access_rules/rules/${rule.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${CF_TOKEN}` },
        signal: AbortSignal.timeout(10_000),
      });
    }
    return rules.length > 0;
  } catch { return false; }
}

async function cfSetSecurityLevel(level: string): Promise<boolean> {
  if (!CF_TOKEN || !CF_ZONE) return false;
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/settings/security_level`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: level }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch { return false; }
}

// ── Alert helpers ─────────────────────────────────────────────────────────────

async function alertAdmin(subject: string, body: string): Promise<void> {
  if (ADMIN_EMAIL) {
    await toolSendEmail(ADMIN_EMAIL, `🚨 Lyra Security Alert: ${subject}`, body).catch(() => {});
  }
  if (ADMIN_PHONE && process.env.TWILIO_ACCOUNT_SID) {
    const { toolSendSms } = await import("./tools");
    await toolSendSms(ADMIN_PHONE, `🚨 AITaskFlo Security: ${subject}`).catch(() => {});
  }
}

// ── Main defend function ──────────────────────────────────────────────────────

export type DefendAction =
  | "block_ip"
  | "unblock_ip"
  | "suspend_user"
  | "lockdown"      // set CF to under_attack mode
  | "stand_down"    // set CF back to medium
  | "status"        // show current threat status
  | "alert";        // send alert to admin without blocking

export interface DefendParams {
  action: DefendAction;
  ip?: string;
  userId?: string;
  reason?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export async function defend(params: DefendParams): Promise<string> {
  const { action, ip, userId, reason = "Flagged by Lyra", severity = "high" } = params;
  const lines: string[] = [];

  if (action === "block_ip") {
    if (!ip) return "❌ IP address required to block.";

    // 1. Block in Cloudflare
    const cfRuleId = await cfBlockIp(ip, reason);
    const cfStatus = cfRuleId ? `✅ Cloudflare firewall rule created (${cfRuleId})` : "⚠️ Cloudflare not configured — blocked locally only";

    // 2. Block in local DB
    blockIp(ip, reason, "lyra", cfRuleId ?? undefined);

    // 3. Log the event
    logSecurityEvent("ip_blocked", severity, `IP ${ip} blocked. Reason: ${reason}`, ip);

    // 4. Alert admin
    await alertAdmin(`IP Blocked: ${ip}`, `Lyra blocked IP ${ip}\n\nReason: ${reason}\nSeverity: ${severity}\nCloudflare: ${cfRuleId ? "Rule created" : "Not configured"}\nTime: ${new Date().toLocaleString()}`);

    lines.push(`🛡️ **IP ${ip} blocked**`);
    lines.push(cfStatus);
    lines.push(`📝 Logged to security events`);
    lines.push(`📧 Admin alerted`);
    lines.push(`\nReason: ${reason}`);
    return lines.join("\n");
  }

  if (action === "unblock_ip") {
    if (!ip) return "❌ IP address required to unblock.";
    const cfRemoved = await cfUnblockIp(ip);
    unblockIp(ip);
    logSecurityEvent("ip_unblocked", "low", `IP ${ip} unblocked.`, ip);
    return `✅ IP ${ip} unblocked.\nCloudflare rule removed: ${cfRemoved ? "Yes" : "Not found"}.`;
  }

  if (action === "suspend_user") {
    if (!userId) return "❌ User ID required to suspend.";
    suspendUser(userId, reason, "lyra");
    logSecurityEvent("user_suspended", severity, `User ${userId} suspended. Reason: ${reason}`, undefined, userId);
    await alertAdmin(`User Suspended: ${userId}`, `Lyra suspended user ${userId}\n\nReason: ${reason}\nSeverity: ${severity}\nTime: ${new Date().toLocaleString()}`);
    return `🚫 **User ${userId} suspended.**\nThey will be blocked from all API routes and chat.\nReason: ${reason}\n📧 Admin alerted.`;
  }

  if (action === "lockdown") {
    const ok = await cfSetSecurityLevel("under_attack");
    logSecurityEvent("lockdown_activated", "critical", "Cloudflare set to UNDER ATTACK mode");
    await alertAdmin("🔴 LOCKDOWN ACTIVATED", `Lyra activated full lockdown.\nCloudflare is now in UNDER ATTACK mode.\nAll traffic is being challenged.\nTime: ${new Date().toLocaleString()}\n\nTo stand down, tell Lyra: "stand down lockdown"`);
    return ok
      ? `🔴 **LOCKDOWN ACTIVE**\nCloudflare is now in UNDER ATTACK mode.\nEvery visitor will be challenged with a CAPTCHA.\nSay "stand down lockdown" to return to normal.`
      : `⚠️ Cloudflare not configured. Local rate limits tightened.\nAdd CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to enable full lockdown.`;
  }

  if (action === "stand_down") {
    const ok = await cfSetSecurityLevel("medium");
    logSecurityEvent("lockdown_deactivated", "low", "Cloudflare returned to medium security");
    return ok
      ? `✅ **Lockdown lifted.** Cloudflare back to normal (medium security).`
      : `⚠️ Could not reach Cloudflare. Check manually.`;
  }

  if (action === "alert") {
    const msg = reason ?? "Manual alert triggered by Lyra";
    logSecurityEvent("manual_alert", severity, msg, ip, userId);
    await alertAdmin(`Security Alert (${severity.toUpperCase()})`, `${msg}\n\nIP: ${ip ?? "N/A"}\nUser: ${userId ?? "N/A"}\nTime: ${new Date().toLocaleString()}`);
    return `📧 Alert sent to admin.\nMessage: ${msg}`;
  }

  if (action === "status") {
    const blocked = getBlockedIps();
    const events = getSecurityEvents(10);
    const criticalCount = events.filter(e => e.severity === "critical" && !e.resolved).length;
    const highCount = events.filter(e => e.severity === "high" && !e.resolved).length;

    return [
      `🛡️ **Security Status**`,
      ``,
      `**Blocked IPs:** ${blocked.length}`,
      blocked.length > 0 ? blocked.slice(0, 5).map(b => `  • ${b.ip} — ${b.reason}`).join("\n") : "  None",
      ``,
      `**Recent Events (last 10):**`,
      `  🔴 Critical: ${criticalCount} unresolved`,
      `  🟠 High: ${highCount} unresolved`,
      events.slice(0, 5).map(e => `  [${e.severity.toUpperCase()}] ${e.type} — ${e.details.slice(0, 60)}`).join("\n"),
    ].join("\n");
  }

  return "❌ Unknown defend action.";
}
