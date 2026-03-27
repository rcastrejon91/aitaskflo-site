/**
 * lib/lyra/jobscan.ts
 * Fetches remote job listings from free public APIs and RSS feeds.
 * No API keys required. Sources: Remotive, WeWorkRemotely.
 */

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  tags: string[];
  source: string;
  postedAt: string;
  salary?: string;
}

// ── Remotive JSON API ─────────────────────────────────────────────────────────

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location?: string;
  url: string;
  description?: string;
  tags?: string[];
  publication_date?: string;
  salary?: string;
}

async function fetchRemotive(search: string, limit = 25): Promise<JobListing[]> {
  try {
    const url = `https://remotive.com/api/remote-jobs?limit=${limit}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const data = await res.json() as { jobs?: RemotiveJob[] };
    return (data.jobs ?? []).map((j) => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || "Worldwide Remote",
      url: j.url,
      description: (j.description ?? "").replace(/<[^>]+>/g, "").slice(0, 600),
      tags: j.tags ?? [],
      source: "Remotive",
      postedAt: j.publication_date ?? new Date().toISOString(),
      salary: j.salary || undefined,
    }));
  } catch {
    return [];
  }
}

// ── WeWorkRemotely RSS ────────────────────────────────────────────────────────

function extractCdata(block: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  ];
  for (const p of patterns) {
    const m = block.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function parseRss(xml: string, source: string): JobListing[] {
  const results: JobListing[] = [];
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  for (const b of blocks) {
    const block = b[1];
    const title = extractCdata(block, "title").replace(/<[^>]+>/g, "");
    const link  = extractCdata(block, "link") || extractCdata(block, "url");
    const desc  = extractCdata(block, "description").replace(/<[^>]+>/g, "").slice(0, 600);
    const pub   = extractCdata(block, "pubDate");
    const region = extractCdata(block, "region") || "Remote";
    if (!title || !link) continue;
    results.push({
      id: `${source.toLowerCase()}-${Buffer.from(link).toString("base64url").slice(0, 16)}`,
      title,
      company: region,
      location: "Remote",
      url: link,
      description: desc,
      tags: [],
      source,
      postedAt: pub || new Date().toISOString(),
    });
  }
  return results;
}

async function fetchWWR(category = "remote-jobs"): Promise<JobListing[]> {
  try {
    const res = await fetch(`https://weworkremotely.com/${category}.rss`, {
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Lyra-JobScanner/1.0)" },
    });
    if (!res.ok) return [];
    return parseRss(await res.text(), "WWR");
  } catch {
    return [];
  }
}

// ── Scoring / filtering ───────────────────────────────────────────────────────

const HEALTHCARE_KEYWORDS = [
  "health", "healthcare", "medical", "hospital", "clinical", "patient",
  "nursing", "pharmacy", "biotech", "life sciences", "wellness",
  "telemedicine", "telehealth", "ehr", "emr", "robot", "robotics",
  "automation", "diligent", "moxi", "surgical",
];

const TECH_KEYWORDS = [
  "engineer", "developer", "software", "data", "ai", "ml", "machine learning",
  "product", "operations", "manager", "analyst", "coordinator", "specialist",
  "support", "success", "implementation", "consultant", "trainer", "technical",
];

export function scoreJob(job: JobListing, userKeywords: string[] = []): number {
  const text = `${job.title} ${job.company} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
  let score = 0;

  for (const kw of HEALTHCARE_KEYWORDS) {
    if (text.includes(kw)) score += 2;
  }
  for (const kw of TECH_KEYWORDS) {
    if (text.includes(kw)) score += 1;
  }
  for (const kw of userKeywords) {
    if (text.includes(kw.toLowerCase())) score += 3;
  }

  // Boost recent postings
  try {
    const ageMs = Date.now() - new Date(job.postedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 3) score += 5;
    else if (ageDays < 7) score += 3;
    else if (ageDays < 14) score += 1;
  } catch { /* ignore */ }

  return score;
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface JobScanOptions {
  keywords?: string[];   // user-specific keywords to boost
  maxResults?: number;
  minScore?: number;
}

export async function scanJobs(opts: JobScanOptions = {}): Promise<JobListing[]> {
  const { keywords = [], maxResults = 10, minScore = 2 } = opts;

  // Fetch in parallel
  const [remotive1, remotive2, remotive3, wwr] = await Promise.allSettled([
    fetchRemotive("healthcare remote"),
    fetchRemotive("robotics remote"),
    fetchRemotive("health tech"),
    fetchWWR("remote-jobs"),
  ]);

  const all: JobListing[] = [
    ...(remotive1.status === "fulfilled" ? remotive1.value : []),
    ...(remotive2.status === "fulfilled" ? remotive2.value : []),
    ...(remotive3.status === "fulfilled" ? remotive3.value : []),
    ...(wwr.status === "fulfilled" ? wwr.value : []),
  ];

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = all.filter((j) => {
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });

  // Score and sort
  return unique
    .map((j) => ({ job: j, score: scoreJob(j, keywords) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ job }) => job);
}

/** Format a list of jobs for Lyra to present in chat */
export function formatJobsForChat(jobs: JobListing[]): string {
  if (jobs.length === 0) return "No matching remote jobs found right now. Try again later or I can broaden the search.";

  const lines = jobs.map((j, i) =>
    `**${i + 1}. ${j.title}** — ${j.company}\n` +
    `   📍 ${j.location} | 🔗 ${j.url}\n` +
    (j.salary ? `   💰 ${j.salary}\n` : "") +
    `   ${j.description.slice(0, 200).trim()}…\n` +
    `   _(Source: ${j.source} · ${new Date(j.postedAt).toLocaleDateString()})_`
  );

  return `Found **${jobs.length} remote jobs** matching your background:\n\n${lines.join("\n\n")}`;
}

/** Generate a tailored cover letter draft for a specific job */
export function buildCoverLetterPrompt(job: JobListing, userBackground: string): string {
  return `Write a concise, genuine cover letter for this job application.

**Job:** ${job.title} at ${job.company}
**Description:** ${job.description.slice(0, 800)}

**Applicant background:** ${userBackground}

Instructions:
- 3 short paragraphs max
- Lead with what makes them uniquely qualified (real, specific, not generic)
- Mention the company by name
- Confident but not arrogant tone
- End with a clear call to action
- No filler phrases like "I am writing to express my interest"
- Sound like a human wrote it`;
}
