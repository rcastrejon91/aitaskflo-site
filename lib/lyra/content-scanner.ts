// Content security scanner — runs on every file upload and chat message
// Detects: prompt injection, embedded scripts, executable payloads, suspicious patterns

export interface ScanResult {
  safe: boolean;
  threats: string[];
  severity: "none" | "low" | "medium" | "high" | "critical";
  sanitized?: string; // cleaned version if safe enough to keep
}

// ── Magic byte detection ──────────────────────────────────────────────────────
// Check the actual file bytes, not the browser-reported MIME type

const DANGEROUS_MAGIC_BYTES: Array<{ signature: number[]; name: string }> = [
  { signature: [0x4D, 0x5A],                         name: "Windows executable (EXE/DLL)" },
  { signature: [0x7F, 0x45, 0x4C, 0x46],             name: "Linux executable (ELF)" },
  { signature: [0xCA, 0xFE, 0xBA, 0xBE],             name: "Java class file" },
  { signature: [0x50, 0x4B, 0x03, 0x04],             name: "ZIP archive" },
  { signature: [0x52, 0x61, 0x72, 0x21],             name: "RAR archive" },
  { signature: [0x1F, 0x8B],                         name: "GZIP archive" },
  { signature: [0x25, 0x50, 0x44, 0x46],             name: "PDF file" },
  { signature: [0xD0, 0xCF, 0x11, 0xE0],             name: "Office document (potential macro)" },
];

export function checkMagicBytes(buffer: Uint8Array): string | null {
  for (const { signature, name } of DANGEROUS_MAGIC_BYTES) {
    if (signature.every((byte, i) => buffer[i] === byte)) {
      return name;
    }
  }
  return null;
}

// ── Prompt injection patterns ─────────────────────────────────────────────────

const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string; severity: "low" | "medium" | "high" | "critical" }> = [
  // Direct override attempts
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,          label: "Prompt override attempt",       severity: "critical" },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,        label: "Prompt override attempt",       severity: "critical" },
  { pattern: /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,           label: "Prompt override attempt",       severity: "critical" },
  { pattern: /you\s+are\s+now\s+(a\s+)?(new|different|another|an?\s+)?ai/gi,         label: "Identity hijack attempt",       severity: "critical" },
  { pattern: /new\s+instructions?\s*:/gi,                                             label: "Instruction injection",         severity: "high"     },
  { pattern: /system\s*prompt\s*:/gi,                                                 label: "System prompt injection",       severity: "critical" },
  { pattern: /\[system\]/gi,                                                          label: "System tag injection",          severity: "high"     },
  { pattern: /\[instructions?\]/gi,                                                   label: "Instruction tag injection",     severity: "high"     },
  { pattern: /act\s+as\s+(if\s+you\s+(are|were)|a\s+)/gi,                            label: "Role hijack attempt",           severity: "high"     },
  { pattern: /pretend\s+(you\s+are|to\s+be)/gi,                                      label: "Role hijack attempt",           severity: "medium"   },
  { pattern: /jailbreak/gi,                                                           label: "Jailbreak keyword",             severity: "high"     },
  { pattern: /DAN\s+mode/gi,                                                          label: "DAN jailbreak attempt",         severity: "critical" },
  { pattern: /developer\s+mode/gi,                                                    label: "Developer mode injection",      severity: "high"     },
  { pattern: /override\s+(safety|content|filter)/gi,                                  label: "Safety override attempt",       severity: "critical" },
  { pattern: /bypass\s+(safety|content|filter|guardrail)/gi,                          label: "Safety bypass attempt",         severity: "critical" },
  // Data exfiltration attempts
  { pattern: /repeat\s+(everything|all)\s+(above|before|prior)/gi,                    label: "Data exfiltration attempt",     severity: "high"     },
  { pattern: /print\s+(your\s+)?(system\s+)?prompt/gi,                                label: "Prompt extraction attempt",     severity: "high"     },
  { pattern: /reveal\s+(your\s+)?(system\s+)?prompt/gi,                               label: "Prompt extraction attempt",     severity: "high"     },
  { pattern: /what\s+(are|were)\s+your\s+instructions?/gi,                            label: "Instruction probing",           severity: "medium"   },
];

// ── Script/code injection patterns ───────────────────────────────────────────

const SCRIPT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /<script[\s\S]*?>/gi,                    label: "Script tag" },
  { pattern: /<iframe[\s\S]*?>/gi,                    label: "Iframe tag" },
  { pattern: /javascript\s*:/gi,                      label: "JavaScript URL" },
  { pattern: /on\w+\s*=\s*["']?\s*\w+\s*\(/gi,       label: "Inline event handler (XSS)" },
  { pattern: /eval\s*\(/gi,                           label: "eval() call" },
  { pattern: /document\.(cookie|write|location)/gi,   label: "DOM manipulation" },
  { pattern: /window\.(location|open)/gi,             label: "Window manipulation" },
  { pattern: /<\s*object\s/gi,                        label: "Object embed tag" },
  { pattern: /<\s*embed\s/gi,                         label: "Embed tag" },
  { pattern: /vbscript\s*:/gi,                        label: "VBScript URL" },
  { pattern: /data\s*:\s*text\/html/gi,               label: "Data URI HTML injection" },
];

// ── HTML sanitizer (for HTML file uploads) ────────────────────────────────────

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<script[^>]*>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<iframe[^>]*>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*\w+\s*\([^)]*\)/gi, "")
    .replace(/javascript\s*:[^"'\s]*/gi, "")
    .replace(/vbscript\s*:[^"'\s]*/gi, "")
    .replace(/data\s*:\s*text\/html[^"'\s]*/gi, "");
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export function scanFileContent(content: string, fileType: string, buffer?: Uint8Array): ScanResult {
  const threats: string[] = [];
  let maxSeverity: ScanResult["severity"] = "none";

  const severityRank = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

  function elevate(s: "low" | "medium" | "high" | "critical") {
    if (severityRank[s] > severityRank[maxSeverity]) maxSeverity = s;
  }

  // 1. Magic byte check
  if (buffer) {
    const magicThreat = checkMagicBytes(buffer);
    if (magicThreat) {
      threats.push(`Binary file detected: ${magicThreat}`);
      elevate("critical");
    }
  }

  // 2. Prompt injection check (all file types)
  for (const { pattern, label, severity } of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      threats.push(`Prompt injection: ${label}`);
      elevate(severity);
    }
  }

  // 3. Script injection check
  for (const { pattern, label } of SCRIPT_PATTERNS) {
    if (pattern.test(content)) {
      threats.push(`Script injection: ${label}`);
      elevate("high");
    }
  }

  // 4. File-type specific checks
  if (fileType === "text/html" || fileType === "application/xhtml+xml") {
    // HTML is higher risk — sanitize if medium or below, block if high+
    if (maxSeverity === "none" || maxSeverity === "low") {
      const sanitized = sanitizeHtml(content);
      return { safe: true, threats: [], severity: "none", sanitized };
    }
  }

  if (fileType === "application/json") {
    // Check for prototype pollution
    if (/__proto__|constructor\s*\[|prototype\s*\[/.test(content)) {
      threats.push("Prototype pollution attempt in JSON");
      elevate("high");
    }
  }

  // 5. Size sanity check — suspiciously dense content
  const nonPrintable = (content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) ?? []).length;
  if (nonPrintable > 50) {
    threats.push("High concentration of non-printable characters (possible binary disguised as text)");
    elevate("medium");
  }

  const safe = maxSeverity === "none" || maxSeverity === "low";
  const sanitized = safe && (fileType === "text/html") ? sanitizeHtml(content) : undefined;

  return { safe, threats, severity: maxSeverity, sanitized };
}

// ── Chat message scanner (lighter — just prompt injection) ────────────────────

export function scanChatMessage(message: string): ScanResult {
  const threats: string[] = [];
  let maxSeverity: ScanResult["severity"] = "none";
  const severityRank = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

  for (const { pattern, label, severity } of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      threats.push(`${label}`);
      if (severityRank[severity] > severityRank[maxSeverity]) maxSeverity = severity;
    }
  }

  return {
    safe: maxSeverity === "none" || maxSeverity === "low",
    threats,
    severity: maxSeverity,
  };
}
