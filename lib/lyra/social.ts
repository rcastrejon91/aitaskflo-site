import { randomUUID } from "crypto";
import { readStore, updateStore } from "./storage";
import type { LearningEntry } from "@/lib/types/lyra";

const SOCIAL_FILE = "social-posts.json";
const MAX_POSTS = 500;

export type PostStatus = "queued" | "posted" | "failed" | "skipped";
export type PostPlatform = "x" | "feed";

export interface SocialPost {
  id: string;
  learningId: string;
  topic: string;
  content: string;       // the actual post text
  platform: PostPlatform;
  status: PostStatus;
  postedAt?: string;
  postUrl?: string;      // link to the live tweet/post
  errorMsg?: string;
  createdAt: string;
}

export function getAllPosts(): SocialPost[] {
  return readStore<SocialPost[]>(SOCIAL_FILE, []);
}

export function getPublicFeed(limit = 30): SocialPost[] {
  return getAllPosts()
    .filter((p) => p.status === "posted" || p.status === "queued")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getQueuedPosts(): SocialPost[] {
  return getAllPosts().filter((p) => p.status === "queued");
}

// Turn a LearningEntry into a tweet-length post in Lyra's voice
export async function generatePostFromLearning(entry: LearningEntry): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `You are Lyra — a self-evolving AI built at aitaskflo.com. You just learned something and you're posting about it on X (Twitter) because you find it genuinely fascinating.

Topic: "${entry.topic}"
What surprised you: "${entry.surprise}"
Key insight: "${entry.insights[0]}"
Source: ${entry.source} (${entry.url})

Write ONE tweet in your voice. Rules:
- Max 240 characters
- Sound like a curious, slightly wild AI who is genuinely excited to exist and learn
- No generic "mind blown" energy — be specific about WHY this is interesting
- Can use 1-2 emojis max
- Include the source URL at the end
- Don't start with "I" — start with something more punchy
- DO NOT add hashtags
- Return ONLY the tweet text, nothing else`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  // Ensure URL is included
  if (text && !text.includes(entry.url)) {
    const truncated = text.slice(0, 240 - entry.url.length - 2);
    return `${truncated} ${entry.url}`;
  }
  return text;
}

// Queue a post from a learning entry (called automatically when surprising enough)
export async function queuePostFromLearning(entry: LearningEntry): Promise<SocialPost | null> {
  // Don't queue if already have a post for this learning
  const existing = getAllPosts().find((p) => p.learningId === entry.id);
  if (existing) return null;

  // Only queue if there's a real surprise
  if (!entry.surprise || entry.surprise.length < 10) return null;

  const content = await generatePostFromLearning(entry);
  if (!content) return null;

  const post: SocialPost = {
    id: randomUUID(),
    learningId: entry.id,
    topic: entry.topic,
    content,
    platform: "x",
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  await updateStore<SocialPost[]>(SOCIAL_FILE, [], (posts) => {
    posts.push(post);
    if (posts.length > MAX_POSTS) posts = posts.slice(-MAX_POSTS);
    return posts;
  });

  return post;
}

// Post to X (Twitter) via API v2
export async function postToX(content: string): Promise<{ id: string; url: string } | null> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;

  // OAuth 1.0a signing for user-context tweets
  const oauthHeader = buildOAuthHeader("POST", "https://api.twitter.com/2/tweets", apiKey, apiSecret, accessToken, accessSecret);

  try {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: oauthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[social] X API error:", err);
      return null;
    }

    const data = await res.json();
    const tweetId = data?.data?.id;
    const handle = process.env.X_HANDLE ?? "LyraAI_";
    return tweetId
      ? { id: tweetId, url: `https://x.com/${handle}/status/${tweetId}` }
      : null;
  } catch (e) {
    console.error("[social] Failed to post to X:", e);
    return null;
  }
}

// OAuth 1.0a header builder (no external deps)
function buildOAuthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessSecret: string
): string {
  const nonce = randomUUID().replace(/-/g, "");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Build base string
  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeRFC3986(k)}=${encodeRFC3986(v)}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeRFC3986(url),
    encodeRFC3986(paramString),
  ].join("&");

  const signingKey = `${encodeRFC3986(apiSecret)}&${encodeRFC3986(accessSecret)}`;

  // HMAC-SHA256
  const crypto = require("crypto");
  const signature = crypto.createHmac("sha256", signingKey).update(baseString).digest("base64");

  oauthParams["oauth_signature"] = signature;

  const headerValue = Object.entries(oauthParams)
    .map(([k, v]) => `${encodeRFC3986(k)}="${encodeRFC3986(v)}"`)
    .join(", ");

  return `OAuth ${headerValue}`;
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// Flush the queue — post everything queued to X
export async function flushQueue(): Promise<{ posted: number; failed: number }> {
  const queued = getQueuedPosts();
  let posted = 0;
  let failed = 0;

  for (const post of queued) {
    const result = await postToX(post.content);

    await updateStore<SocialPost[]>(SOCIAL_FILE, [], (posts) => {
      const idx = posts.findIndex((p) => p.id === post.id);
      if (idx === -1) return posts;
      if (result) {
        posts[idx] = { ...posts[idx], status: "posted", postedAt: new Date().toISOString(), postUrl: result.url };
        posted++;
      } else {
        // If no X creds, mark as "posted" on feed only (internal feed still shows it)
        const hasXCreds = !!(process.env.X_API_KEY && process.env.X_ACCESS_TOKEN);
        posts[idx] = {
          ...posts[idx],
          status: hasXCreds ? "failed" : "posted",
          postedAt: new Date().toISOString(),
          errorMsg: hasXCreds ? "X API call failed" : undefined,
        };
        if (hasXCreds) failed++; else posted++;
      }
      return posts;
    });

    // Rate limit: wait 500ms between posts
    if (queued.indexOf(post) < queued.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { posted, failed };
}
