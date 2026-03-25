/**
 * lib/lyra/providers.ts
 * Multi-provider AI client selector for Lyra.
 * Priority: Groq → Grok (xAI) → Claude Haiku
 */

import Groq from "groq-sdk";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type Provider = "groq" | "grok" | "claude";

export interface ProviderConfig {
  provider: Provider;
  model: string;
}

/** Returns which provider + model to use for real-time decisions (game AI, game guide) */
export function getRealtimeProvider(): ProviderConfig {
  if (process.env.GROQ_API_KEY) {
    return { provider: "groq", model: "llama-3.3-70b-versatile" };
  }
  if (process.env.XAI_API_KEY) {
    return { provider: "grok", model: "grok-2-latest" };
  }
  return { provider: "claude", model: "claude-haiku-4-5-20251001" };
}

/** Returns which provider + model to use for chat / routing */
export function getChatProvider(): ProviderConfig {
  if (process.env.XAI_API_KEY) {
    return { provider: "grok", model: "grok-2-latest" };
  }
  return { provider: "claude", model: "claude-sonnet-4-6" };
}

/** Returns which provider + model to use for game building */
export function getBuildProvider(): ProviderConfig {
  if (process.env.XAI_API_KEY) {
    return { provider: "grok", model: "grok-2-latest" };
  }
  return { provider: "claude", model: "claude-opus-4-6" };
}

// ── Unified completion function ───────────────────────────────────────────────

export interface CompletionMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CompletionOptions {
  config: ProviderConfig;
  system?: string;
  messages: CompletionMessage[];
  maxTokens?: number;
  temperature?: number;
}

export async function complete(opts: CompletionOptions): Promise<string> {
  const { config, system, messages, maxTokens = 512, temperature = 0.7 } = opts;

  if (config.provider === "groq") {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const msgs: Groq.Chat.ChatCompletionMessageParam[] = [];
    if (system) msgs.push({ role: "system", content: system });
    msgs.push(...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));

    const res = await groq.chat.completions.create({
      model: config.model,
      messages: msgs,
      max_tokens: maxTokens,
      temperature,
    });
    return res.choices[0]?.message?.content ?? "";
  }

  if (config.provider === "grok") {
    const grok = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
    const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (system) msgs.push({ role: "system", content: system });
    msgs.push(...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));

    const res = await grok.chat.completions.create({
      model: config.model,
      messages: msgs,
      max_tokens: maxTokens,
      temperature,
    });
    return res.choices[0]?.message?.content ?? "";
  }

  // Claude fallback
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const claudeMsgs = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const res = await anthropic.messages.create({
    model: config.model,
    max_tokens: maxTokens,
    system: system,
    messages: claudeMsgs,
  });
  return res.content[0]?.type === "text" ? res.content[0].text : "";
}
