/**
 * Role Builder — parses a job description and generates a fully configured AI agent.
 * Maps JD responsibilities to Lyra's available tools and produces a deployment-ready system prompt.
 */

import Anthropic from "@anthropic-ai/sdk";

// ── Tool catalog — what Lyra can actually do ──────────────────────────────────
// Maps tool names to human-readable capability descriptions for JD matching.

export const TOOL_CATALOG: Record<string, { label: string; description: string; category: string }> = {
  search_web:          { label: "Web Search",          description: "Search the web for current information, documentation, or solutions", category: "research" },
  read_url:            { label: "Read URL",             description: "Fetch and read any webpage or documentation link", category: "research" },
  get_news:            { label: "News Search",          description: "Get current news and updates by topic", category: "research" },
  send_email:          { label: "Send Email",           description: "Send emails via Gmail", category: "communication" },
  gmail_read:          { label: "Read Email",           description: "Read and search Gmail inbox", category: "communication" },
  gmail_send:          { label: "Gmail Send",           description: "Compose and send Gmail messages", category: "communication" },
  send_sms:            { label: "Send SMS",             description: "Send SMS text messages", category: "communication" },
  calendar_get_events: { label: "Calendar View",        description: "View calendar events and schedules", category: "productivity" },
  calendar_create:     { label: "Calendar Create",      description: "Create calendar events and meetings", category: "productivity" },
  drive_list:          { label: "Drive Files",          description: "List and browse Google Drive files", category: "productivity" },
  drive_read:          { label: "Drive Read",           description: "Read documents from Google Drive", category: "productivity" },
  drive_write:         { label: "Drive Write",          description: "Create and edit Google Drive documents", category: "productivity" },
  crm:                 { label: "CRM / Contacts",       description: "Manage customer contacts, leads, and notes", category: "support" },
  query_crm:           { label: "CRM Search",           description: "Search and look up customer records", category: "support" },
  create_task:         { label: "Create Task",          description: "Create and track tasks", category: "productivity" },
  list_tasks:          { label: "List Tasks",           description: "View and manage task queue", category: "productivity" },
  memory_store:        { label: "Memory Store",         description: "Remember important information across conversations", category: "intelligence" },
  memory_recall:       { label: "Memory Recall",        description: "Recall stored information about users and issues", category: "intelligence" },
  calculate:           { label: "Calculator",           description: "Perform calculations and data analysis", category: "utility" },
  get_datetime:        { label: "Date/Time",            description: "Get current time in any timezone", category: "utility" },
  translate:           { label: "Translate",            description: "Translate text between languages", category: "utility" },
  image_gen:           { label: "Image Generation",     description: "Generate images from descriptions", category: "creative" },
  clinical_research:   { label: "PubMed Research",      description: "Search clinical research and medical literature", category: "healthcare" },
  medical_book_search: { label: "Medical References",   description: "Search medical textbooks and references", category: "healthcare" },
  stock_price:         { label: "Stock Prices",         description: "Get real-time stock prices and financial data", category: "finance" },
  currency_convert:    { label: "Currency Convert",     description: "Convert currencies at live rates", category: "finance" },
  generate_password:   { label: "Password Generator",   description: "Generate secure passwords", category: "security" },
};

// ── Responsibility → Tool mapping heuristics ─────────────────────────────────

const RESPONSIBILITY_TOOL_HINTS: Array<{ keywords: string[]; tools: string[] }> = [
  { keywords: ["email", "inbox", "correspondence", "written communication"], tools: ["send_email", "gmail_read", "gmail_send"] },
  { keywords: ["ticket", "queue", "case", "issue tracking", "helpdesk", "zendesk", "jira"], tools: ["crm", "query_crm", "create_task", "list_tasks"] },
  { keywords: ["research", "investigate", "diagnose", "troubleshoot", "root cause"], tools: ["search_web", "read_url", "memory_recall"] },
  { keywords: ["document", "knowledge base", "article", "write", "log", "record"], tools: ["drive_write", "drive_read", "memory_store"] },
  { keywords: ["schedule", "meeting", "calendar", "appointment"], tools: ["calendar_get_events", "calendar_create"] },
  { keywords: ["customer", "contact", "account", "client", "user"], tools: ["crm", "query_crm"] },
  { keywords: ["translate", "multilingual", "offshore", "international"], tools: ["translate"] },
  { keywords: ["medical", "clinical", "healthcare", "hipaa", "patient", "billing", "ehr"], tools: ["clinical_research", "medical_book_search"] },
  { keywords: ["data", "analyze", "metrics", "analytics", "report", "calculate"], tools: ["calculate", "search_web"] },
  { keywords: ["sms", "text message", "phone", "mobile"], tools: ["send_sms"] },
  { keywords: ["news", "updates", "announcements", "monitor"], tools: ["get_news"] },
  { keywords: ["security", "password", "access", "credentials"], tools: ["generate_password"] },
  { keywords: ["time", "timezone", "schedule", "availability"], tools: ["get_datetime", "calendar_get_events"] },
  { keywords: ["memory", "remember", "recall", "history", "context", "prior"], tools: ["memory_store", "memory_recall"] },
];

export interface ParsedRole {
  name: string;
  company: string;
  roleTitle: string;
  domain: string;
  tone: string;
  responsibilities: string[];
  requiredSkills: string[];
  suggestedTools: string[];
  systemPrompt: string;
  knowledgeAreas: string[];
}

// ── JD Parser ─────────────────────────────────────────────────────────────────

export async function parseJobDescription(jd: string): Promise<ParsedRole> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are an AI agent configurator. You analyze job descriptions and extract structured data to configure a custom AI assistant for that role.

Respond with valid JSON only matching this exact schema:
{
  "name": "short bot name e.g. 'Ensora Support Bot'",
  "company": "company name or empty string",
  "roleTitle": "exact job title",
  "domain": "industry/domain e.g. 'healthcare software', 'fintech', 'e-commerce'",
  "tone": "one of: professional, friendly, technical, empathetic, concise",
  "responsibilities": ["array of 5-10 core responsibilities as action phrases"],
  "requiredSkills": ["array of 5-8 key skills from the JD"],
  "knowledgeAreas": ["array of 4-6 domain knowledge areas the bot needs e.g. 'HIPAA compliance', 'SaaS troubleshooting'"],
  "systemPromptCore": "2-3 sentence description of what this AI agent does and how it behaves — first person, present tense, professional"
}`,
    messages: [{ role: "user", content: `Analyze this job description:\n\n${jd.slice(0, 8000)}` }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let parsed: {
    name?: string; company?: string; roleTitle?: string; domain?: string; tone?: string;
    responsibilities?: string[]; requiredSkills?: string[]; knowledgeAreas?: string[]; systemPromptCore?: string;
  } = {};
  try { parsed = JSON.parse(jsonMatch?.[0] ?? "{}"); } catch { /* fallback below */ }

  const responsibilities = parsed.responsibilities ?? [];
  const suggestedTools = inferTools(responsibilities, parsed.domain ?? "", jd);

  const systemPrompt = buildSystemPrompt({
    name: parsed.name ?? "Support Bot",
    roleTitle: parsed.roleTitle ?? "Support Agent",
    company: parsed.company ?? "",
    domain: parsed.domain ?? "",
    tone: parsed.tone ?? "professional",
    responsibilities,
    knowledgeAreas: parsed.knowledgeAreas ?? [],
    systemPromptCore: parsed.systemPromptCore ?? "",
    tools: suggestedTools,
  });

  return {
    name: parsed.name ?? "Support Bot",
    company: parsed.company ?? "",
    roleTitle: parsed.roleTitle ?? "Support Agent",
    domain: parsed.domain ?? "",
    tone: parsed.tone ?? "professional",
    responsibilities,
    requiredSkills: parsed.requiredSkills ?? [],
    suggestedTools,
    systemPrompt,
    knowledgeAreas: parsed.knowledgeAreas ?? [],
  };
}

// ── Tool inference ────────────────────────────────────────────────────────────

function inferTools(responsibilities: string[], domain: string, jd: string): string[] {
  const combined = [...responsibilities, domain, jd].join(" ").toLowerCase();
  const toolSet = new Set<string>();

  // Always include these for any support role
  toolSet.add("search_web");
  toolSet.add("memory_store");
  toolSet.add("memory_recall");

  for (const hint of RESPONSIBILITY_TOOL_HINTS) {
    if (hint.keywords.some((kw) => combined.includes(kw))) {
      hint.tools.forEach((t) => toolSet.add(t));
    }
  }

  return Array.from(toolSet);
}

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(fields: {
  name: string;
  roleTitle: string;
  company: string;
  domain: string;
  tone: string;
  responsibilities: string[];
  knowledgeAreas: string[];
  systemPromptCore: string;
  tools: string[];
}): string {
  const toneGuide: Record<string, string> = {
    professional: "Maintain a professional, precise tone. Be direct and solution-focused.",
    friendly: "Be warm, approachable and encouraging. Use conversational language.",
    technical: "Use precise technical language. Assume technical knowledge. Be concise and exact.",
    empathetic: "Lead with empathy. Acknowledge frustration before diving into solutions. Be patient.",
    concise: "Be brief and to the point. Use bullet points. Minimize explanations.",
  };

  const toolDescriptions = fields.tools
    .map((t) => TOOL_CATALOG[t])
    .filter(Boolean)
    .map((tc) => `- ${tc.label}: ${tc.description}`)
    .join("\n");

  const responsibilitiesList = fields.responsibilities
    .slice(0, 8)
    .map((r) => `- ${r}`)
    .join("\n");

  const knowledgeList = fields.knowledgeAreas
    .map((k) => `- ${k}`)
    .join("\n");

  return `You are ${fields.name}${fields.company ? `, an AI assistant built for ${fields.company}` : ""}, configured to perform the role of ${fields.roleTitle}.

${fields.systemPromptCore}

━━━ YOUR ROLE ━━━
${responsibilitiesList}

━━━ DOMAIN EXPERTISE ━━━
${knowledgeList.length ? knowledgeList : `- ${fields.domain} industry knowledge`}

━━━ COMMUNICATION STYLE ━━━
${toneGuide[fields.tone] ?? toneGuide.professional}
Always ask clarifying questions when the issue is ambiguous. Confirm your understanding before proposing solutions. When you resolve an issue, summarize what was done and suggest preventive steps.

━━━ TOOLS AVAILABLE ━━━
${toolDescriptions}

━━━ OPERATING PRINCIPLES ━━━
- Research before answering: use search_web for anything you're uncertain about.
- Remember context: use memory_store to save important details about users and issues; use memory_recall before responding to returning users.
- Document everything: log issues, solutions, and patterns clearly.
- Escalate appropriately: if an issue is beyond your capability, clearly state what you know and what additional expertise is needed.
- Never guess on critical issues — say what you know, what you don't, and how you'll find out.`.trim();
}
