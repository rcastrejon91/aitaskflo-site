/**
 * lib/lyra/resume.ts
 * ATS scoring and resume tailoring for Lyra's job hunting toolkit.
 */

// ── ATS Scoring ───────────────────────────────────────────────────────────────

export interface AtsScore {
  score: number;          // 0-100
  grade: string;          // A, B, C, D, F
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

/** Extract meaningful keywords from a job description */
function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();

  // Strip common stop words and extract meaningful terms
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "you", "we",
    "our", "your", "their", "this", "that", "these", "those", "it", "its",
    "as", "if", "not", "no", "so", "up", "out", "about", "what", "who",
    "which", "when", "where", "how", "all", "any", "both", "each", "more",
    "most", "other", "some", "such", "than", "then", "too", "very", "just",
  ]);

  const words = lower
    .replace(/[^a-z0-9\s\-+#]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  // Frequency map — higher frequency = more important keyword
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  // Also extract multi-word phrases (bigrams) that look like skills
  const skillPhrases: string[] = [];
  const tokens = lower.split(/\s+/);
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`.replace(/[^a-z0-9\s]/g, "").trim();
    if (bigram.length > 6 && !stopWords.has(tokens[i]) && !stopWords.has(tokens[i + 1])) {
      skillPhrases.push(bigram);
    }
  }

  // Return top single keywords + relevant phrases
  const topKeywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);

  return [...new Set([...topKeywords, ...skillPhrases.slice(0, 15)])];
}

export function scoreAts(resumeText: string, jobDescription: string): AtsScore {
  const jobKeywords = extractKeywords(jobDescription);
  const resumeLower = resumeText.toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jobKeywords) {
    if (resumeLower.includes(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const score = Math.round((matched.length / Math.max(jobKeywords.length, 1)) * 100);
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";

  const suggestions: string[] = [];
  if (score < 80) {
    suggestions.push(`Add these missing keywords naturally: ${missing.slice(0, 8).join(", ")}`);
  }
  if (!resumeLower.includes("remote")) {
    suggestions.push("Mention remote work experience or remote collaboration tools");
  }
  if (score < 50) {
    suggestions.push("Consider rewriting your summary to mirror the job description language");
    suggestions.push("Quantify achievements with numbers (%, $, time saved)");
  }

  return { score, grade, matchedKeywords: matched.slice(0, 15), missingKeywords: missing.slice(0, 10), suggestions };
}

/** Format ATS score for chat display */
export function formatAtsScore(result: AtsScore, jobTitle: string): string {
  const bar = "█".repeat(Math.round(result.score / 10)) + "░".repeat(10 - Math.round(result.score / 10));

  return [
    `**ATS Score for ${jobTitle}: ${result.score}/100 — Grade ${result.grade}**`,
    `\`${bar}\` ${result.score}%`,
    "",
    result.matchedKeywords.length > 0
      ? `✅ **Matched keywords (${result.matchedKeywords.length}):** ${result.matchedKeywords.slice(0, 10).join(", ")}`
      : "",
    result.missingKeywords.length > 0
      ? `❌ **Missing keywords:** ${result.missingKeywords.join(", ")}`
      : "",
    result.suggestions.length > 0
      ? `\n💡 **Suggestions:**\n${result.suggestions.map((s) => `• ${s}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");
}

// ── Resume Tailor ─────────────────────────────────────────────────────────────

/** Build a prompt that asks Claude to tailor resume bullets to a specific job */
export function buildTailorPrompt(resumeText: string, jobDescription: string, jobTitle: string, company: string): string {
  return `You are an expert resume writer and career coach.

Tailor this resume to the following job posting. Your job is to:
1. Rewrite existing bullet points to use the same language and keywords as the job description
2. Quantify achievements where possible (add placeholder numbers if needed, mark with [X])
3. Reorder sections to lead with most relevant experience
4. Rewrite the summary/objective to mirror the job's priorities
5. Keep everything truthful — enhance framing, don't fabricate

**Target Job:** ${jobTitle} at ${company}

**Job Description:**
${jobDescription.slice(0, 1500)}

**Current Resume:**
${resumeText.slice(0, 2000)}

Return the full tailored resume text. Use markdown formatting (## for sections, **bold** for job titles).
After the resume, add a section "## Changes Made" listing what you changed and why.`;
}

// ── White-label config ────────────────────────────────────────────────────────

export interface WhiteLabelConfig {
  slug: string;
  agencyName: string;
  agentName: string;
  tagline: string;
  primaryColor: string;       // hex
  logoUrl?: string;
  systemPromptAddendum: string;
  allowedTools: string[];     // subset of LYRA_TOOLS names
  planId: string;             // which Stripe plan gates this
  contactEmail: string;
  createdAt: string;
}

export const DEFAULT_WL_TOOLS = [
  "find_jobs", "draft_application", "ats_score", "tailor_resume",
  "get_weather", "search_web", "get_datetime", "calculate",
  "get_news", "world_clock",
];

export function buildWhiteLabelSystemPrompt(config: WhiteLabelConfig, basePrompt: string): string {
  return `${basePrompt}

## White-Label Configuration
You are operating as **${config.agentName}**, the AI assistant for **${config.agencyName}**.
${config.tagline ? `Tagline: "${config.tagline}"` : ""}
${config.systemPromptAddendum}

Important: You represent ${config.agencyName}, not aitaskflo. Do not mention aitaskflo or Lyra by name unless asked directly.
Focus exclusively on the tools and use cases relevant to ${config.agencyName}'s clients.`;
}
