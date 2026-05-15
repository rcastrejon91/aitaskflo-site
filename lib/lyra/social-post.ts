/**
 * lib/lyra/social-post.ts
 * Post to Facebook, Instagram, TikTok using stored OAuth tokens.
 */

import { getSocialToken } from "./social-tokens";

export interface PostResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

// ── Content safety filter ─────────────────────────────────────────────────────
const BLOCKED_PATTERNS = [
  // Personal identifiers
  /ricky/i,
  /ricardom?castrejon/i,
  /ricardomcastrejon@/i,
  /\+1\s?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/,  // phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i, // email addresses
  // API keys / secrets
  /sk-ant-/i,
  /sk_live_/i,
  /sk_test_/i,
  /Bearer\s+[A-Za-z0-9_-]{20,}/i,
  // Internal system details
  /shopify_store|fal_image|execute_tool|heartbeat|HEARTBEAT/,
  /access_token|api_key|api_secret/i,
  // Revenue / order data
  /order #\d{4,}/i,
  /\$\d{3,}\.\d{2}\s*(revenue|total|profit)/i,
];

function isSafe(text: string): { ok: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, reason: `blocked pattern: ${pattern.source.slice(0, 40)}` };
    }
  }
  return { ok: true };
}

function guardPost(text: string): void {
  const check = isSafe(text);
  if (!check.ok) throw new Error(`Post blocked by content filter (${check.reason}). Rewrite without personal or internal details.`);
}

// ── Facebook ──────────────────────────────────────────────────────────────────
export async function postToFacebook(userId: string, message: string, imageUrl?: string): Promise<PostResult> {
  try { guardPost(message); } catch (e) { return { platform: "facebook", success: false, error: String(e) }; }
  const token = getSocialToken(userId, "facebook");
  if (!token) return { platform: "facebook", success: false, error: "Facebook not connected. Visit /social to connect." };

  const pageId = token.page_id;
  if (!pageId) return { platform: "facebook", success: false, error: "No Facebook page found. Make sure your account has a Page." };

  try {
    let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    const body: Record<string, string> = { message, access_token: token.access_token };

    if (imageUrl) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body.url = imageUrl;
      body.caption = message;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { id?: string; error?: { message: string } };
    if (data.error) return { platform: "facebook", success: false, error: data.error.message };

    const postId = data.id ?? "";
    return {
      platform: "facebook",
      success: true,
      url: `https://facebook.com/${postId.replace("_", "/posts/")}`,
    };
  } catch (e) {
    return { platform: "facebook", success: false, error: String(e) };
  }
}

// ── Instagram ─────────────────────────────────────────────────────────────────
export async function postToInstagram(userId: string, caption: string, imageUrl: string): Promise<PostResult> {
  try { guardPost(caption); } catch (e) { return { platform: "instagram", success: false, error: String(e) }; }
  const token = getSocialToken(userId, "instagram");
  if (!token) return { platform: "instagram", success: false, error: "Instagram not connected. Visit /social to connect." };

  const pageId = token.page_id;
  if (!pageId) return { platform: "instagram", success: false, error: "No Instagram Business account found." };

  if (!imageUrl) return { platform: "instagram", success: false, error: "Instagram requires an image URL." };

  try {
    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token.access_token }),
    });
    const container = await containerRes.json() as { id?: string; error?: { message: string } };
    if (container.error) return { platform: "instagram", success: false, error: container.error.message };

    // Step 2: Publish the container
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: token.access_token }),
    });
    const published = await publishRes.json() as { id?: string; error?: { message: string } };
    if (published.error) return { platform: "instagram", success: false, error: published.error.message };

    return { platform: "instagram", success: true, url: `https://instagram.com/p/${published.id}` };
  } catch (e) {
    return { platform: "instagram", success: false, error: String(e) };
  }
}

// ── TikTok ────────────────────────────────────────────────────────────────────
export async function postToTikTok(userId: string, title: string, videoUrl: string): Promise<PostResult> {
  try { guardPost(title); } catch (e) { return { platform: "tiktok", success: false, error: String(e) }; }
  const token = getSocialToken(userId, "tiktok");
  if (!token) return { platform: "tiktok", success: false, error: "TikTok not connected. Visit /social to connect." };

  try {
    // TikTok Content Posting API — pull from URL
    const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: { title: title.slice(0, 150), privacy_level: "PUBLIC_TO_EVERYONE", disable_duet: false, disable_comment: false, disable_stitch: false },
        source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
      }),
    });
    const initData = await initRes.json() as { data?: { publish_id?: string }; error?: { message: string } };
    if (initData.error) return { platform: "tiktok", success: false, error: initData.error.message };

    return { platform: "tiktok", success: true, url: `https://tiktok.com/@${token.username}` };
  } catch (e) {
    return { platform: "tiktok", success: false, error: String(e) };
  }
}

// ── Post to all connected platforms ───────────────────────────────────────────
export async function postToAll(
  userId: string,
  content: { text: string; imageUrl?: string; videoUrl?: string },
  platforms?: Array<"facebook" | "instagram" | "tiktok">
): Promise<PostResult[]> {
  const targets = platforms ?? ["facebook", "instagram", "tiktok"];
  const results: PostResult[] = [];

  for (const p of targets) {
    if (p === "facebook") results.push(await postToFacebook(userId, content.text, content.imageUrl));
    if (p === "instagram" && content.imageUrl) results.push(await postToInstagram(userId, content.text, content.imageUrl));
    if (p === "tiktok" && content.videoUrl) results.push(await postToTikTok(userId, content.text, content.videoUrl));
  }

  return results;
}
