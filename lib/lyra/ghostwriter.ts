import { randomUUID } from "crypto";
import { readStore, updateStore } from "./storage";

const GW_FILE = "ghostwriter-docs.json";
const MAX_DOCS = 300;

export type GWFormat =
  | "blog_post"
  | "linkedin"
  | "email"
  | "twitter_thread"
  | "youtube_script"
  | "newsletter"
  | "ad_copy"
  | "bio";

export interface GWDoc {
  id: string;
  userId: string;
  title: string;
  format: GWFormat;
  topic: string;
  tone: string;
  content: string;
  wordCount: number;
  createdAt: string;
}

export function getAllDocs(userId: string): GWDoc[] {
  const all = readStore<GWDoc[]>(GW_FILE, []);
  return all
    .filter((d) => d.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveDoc(doc: GWDoc): void {
  const all = readStore<GWDoc[]>(GW_FILE, []);
  all.unshift(doc);
  updateStore(GW_FILE, all.slice(0, MAX_DOCS));
}

export function deleteDoc(userId: string, docId: string): void {
  const all = readStore<GWDoc[]>(GW_FILE, []);
  updateStore(GW_FILE, all.filter((d) => !(d.id === docId && d.userId === userId)));
}

const FORMAT_LABELS: Record<GWFormat, string> = {
  blog_post: "Blog Post",
  linkedin: "LinkedIn Article",
  email: "Email",
  twitter_thread: "Twitter/X Thread",
  youtube_script: "YouTube Script",
  newsletter: "Newsletter",
  ad_copy: "Ad Copy",
  bio: "Professional Bio",
};

const FORMAT_INSTRUCTIONS: Record<GWFormat, string> = {
  blog_post: "Write a full SEO-optimized blog post with H2 headers, intro hook, body sections, and a strong conclusion with CTA. 600–1200 words.",
  linkedin: "Write a LinkedIn article with a punchy opening line, 3–5 insight sections, personal voice, and a question at the end to drive engagement. 400–800 words.",
  email: "Write a professional email with subject line, personalized opening, clear value proposition, and a specific CTA. Concise and direct.",
  twitter_thread: "Write a Twitter/X thread. Start with a hook tweet, then 6–10 numbered tweets (max 280 chars each), end with a summary tweet. Format each tweet on its own line starting with the tweet number.",
  youtube_script: "Write a YouTube video script with hook (first 15 seconds), intro, 3–5 main sections with transitions, and outro with subscribe CTA. Include [B-ROLL] and [PAUSE] notes.",
  newsletter: "Write an engaging newsletter issue with subject line, intro, main story/insight, quick tips section, and closing. Conversational and valuable.",
  ad_copy: "Write compelling ad copy with headline, subheadline, 3 benefit bullets, social proof line, and CTA button text. Multiple variations if helpful.",
  bio: "Write a professional bio in first and third person. Highlight expertise, achievements, personality, and a human detail. 150–250 words each.",
};

export async function generateContent(params: {
  format: GWFormat;
  topic: string;
  tone: string;
  context?: string;
  userId: string;
}): Promise<GWDoc> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are Lyra, an expert ghost writer powered by AITaskFlo. You write in the user's requested tone — ${params.tone}. You produce high-quality, original content that sounds authentic, not AI-generated. Never add disclaimers or meta-commentary. Just write the content directly.`;

  const userPrompt = `${FORMAT_INSTRUCTIONS[params.format]}

Topic: ${params.topic}
Tone: ${params.tone}
${params.context ? `Additional context: ${params.context}` : ""}

Write the full content now. Do not explain what you're doing — just write it.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = (msg.content[0] as { type: string; text: string }).text.trim();
  const wordCount = content.split(/\s+/).length;

  const doc: GWDoc = {
    id: randomUUID(),
    userId: params.userId,
    title: `${FORMAT_LABELS[params.format]}: ${params.topic.slice(0, 60)}`,
    format: params.format,
    topic: params.topic,
    tone: params.tone,
    content,
    wordCount,
    createdAt: new Date().toISOString(),
  };

  saveDoc(doc);
  return doc;
}

export { FORMAT_LABELS };
