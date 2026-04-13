import { randomUUID } from "crypto";
import { readStore, updateStore } from "./storage";
import { toolSearchWeb } from "./tools";

const BIZ_FILE = "business-profiles.json";
const MAX_PROFILES = 200;

export interface BusinessProfile {
  id: string;
  userId: string;
  companyName: string;
  businessType: string;
  location: string;
  plan: string;
  financials: string;
  playbook: string;
  menu?: string;          // food businesses
  automations: string;
  marketing: string;
  status: "building" | "complete";
  createdAt: string;
  updatedAt: string;
}

export function getAllProfiles(userId: string): BusinessProfile[] {
  return readStore<BusinessProfile[]>(BIZ_FILE, [])
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getProfile(userId: string, id: string): BusinessProfile | null {
  return readStore<BusinessProfile[]>(BIZ_FILE, [])
    .find((p) => p.id === id && p.userId === userId) ?? null;
}

export function saveProfile(profile: BusinessProfile): void {
  const all = readStore<BusinessProfile[]>(BIZ_FILE, []);
  const idx = all.findIndex((p) => p.id === profile.id);
  if (idx >= 0) all[idx] = profile;
  else all.unshift(profile);
  updateStore(BIZ_FILE, all.slice(0, MAX_PROFILES));
}

export function deleteProfile(userId: string, id: string): void {
  const all = readStore<BusinessProfile[]>(BIZ_FILE, []);
  updateStore(BIZ_FILE, all.filter((p) => !(p.id === id && p.userId === userId)));
}

const FOOD_TYPES = ["restaurant", "food", "cafe", "coffee", "bakery", "taco", "pizza", "burger",
  "sushi", "bar", "pub", "catering", "food truck", "bistro", "diner", "deli", "brewery"];

function isFood(type: string): boolean {
  return FOOD_TYPES.some((f) => type.toLowerCase().includes(f));
}

async function claudeGenerate(system: string, prompt: string, maxTokens = 1500): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return (msg.content[0] as { type: string; text: string }).text.trim();
}

export async function buildBusinessOS(params: {
  companyName: string;
  businessType: string;
  location: string;
  context?: string;
  userId: string;
}): Promise<BusinessProfile> {
  const { companyName, businessType, location, context, userId } = params;
  const id = randomUUID();
  const now = new Date().toISOString();
  const food = isFood(businessType);

  const profile: BusinessProfile = {
    id,
    userId,
    companyName,
    businessType,
    location,
    plan: "",
    financials: "",
    playbook: "",
    automations: "",
    marketing: "",
    status: "building",
    createdAt: now,
    updatedAt: now,
  };
  saveProfile(profile);

  const sysVoice = `You are an expert business strategist and operator. Write practical, specific, actionable content for ${companyName}, a ${businessType} in ${location}. Be concrete — use real numbers, real timelines, real tactics. No generic filler.`;

  // 1. Market research
  const marketData = await toolSearchWeb(`${businessType} business ${location} market size competition 2024`).catch(() => "");

  // 2. Business plan
  profile.plan = await claudeGenerate(sysVoice, `
Write a complete business plan for ${companyName}.
Business type: ${businessType}
Location: ${location}
${context ? `Owner notes: ${context}` : ""}
Market research found: ${marketData.slice(0, 800)}

Include:
## Executive Summary
## Problem & Solution
## Target Customer (specific demographics, psychographics)
## Revenue Model (how money is made, pricing)
## Competitive Advantage
## Go-To-Market Strategy (first 90 days)
## Key Risks & Mitigations
`, 1800);

  // 3. Financial model
  profile.financials = await claudeGenerate(sysVoice, `
Create a financial model for ${companyName} (${businessType} in ${location}).

Include:
## Startup Costs (itemized, realistic for this type of business)
## Monthly Fixed Expenses
## Monthly Variable Expenses
## Revenue Projections (Month 1, 3, 6, 12)
## Break-Even Analysis (exact month and revenue needed)
## Profit Margins
## Cash Flow Notes (when to expect positive cash flow)

Use real dollar amounts. Be specific to ${businessType} in ${location}.
`, 1500);

  // 4. Operations playbook
  profile.playbook = await claudeGenerate(sysVoice, `
Write a complete operations playbook for ${companyName}.

Include:
## Daily Opening Checklist
## Daily Closing Checklist
## Weekly Tasks
## Monthly Tasks
## Staff Onboarding (first week schedule)
## Customer Service Standards
## Quality Control Process
## Emergency Procedures

Make it ready to hand to an employee on day one.
`, 1500);

  // 5. Menu / recipes (food only)
  if (food) {
    profile.menu = await claudeGenerate(sysVoice, `
Create a complete menu and recipe guide for ${companyName}.

For each item include:
- Item name & description
- Key ingredients (with rough quantities)
- Food cost estimate (%)
- Recommended selling price
- Preparation notes

Create 8-12 items that make sense for a ${businessType} in ${location}.
Include: food cost target (aim for 28-32%), highest margin items to push, and suggested combos/upsells.
`, 1500);
  }

  // 6. Automations plan
  profile.automations = await claudeGenerate(sysVoice, `
Design a complete automation system for ${companyName} (${businessType} in ${location}).

For each automation include the trigger, what it does, and which tool handles it.

Cover:
## Customer Communication Automations
(welcome emails, follow-ups, review requests, appointment reminders)

## Sales & CRM Automations
(lead capture, pipeline updates, proposal sending, invoice triggers)

## Operations Automations
(inventory alerts, supplier reorder emails, weekly reports, staff scheduling reminders)

## Marketing Automations
(social post schedule, email newsletter cadence, ad performance alerts)

Be specific — name the exact trigger, action, and timing for each.
`, 1500);

  // 7. Marketing plan
  profile.marketing = await claudeGenerate(sysVoice, `
Write a 90-day marketing launch plan for ${companyName} (${businessType} in ${location}).

Include:
## Week 1-2: Pre-Launch (build buzz before opening)
## Week 3-4: Launch Week (opening promotions, press, social)
## Month 2: Growth (what's working, double down)
## Month 3: Retention (loyalty, referrals, reviews)

For each phase include:
- Specific actions (not vague)
- Which platforms/channels
- Content ideas (3-5 specific post/email ideas)
- Budget estimate
- Success metric

Also include: top 5 growth tactics specific to ${businessType} in ${location}.
`, 1500);

  profile.status = "complete";
  profile.updatedAt = new Date().toISOString();
  saveProfile(profile);

  return profile;
}
