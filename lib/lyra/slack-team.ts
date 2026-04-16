/**
 * lib/lyra/slack-team.ts
 * Autonomous AI team that lives in Slack — posts, fights, reacts, and creates drama.
 * Each persona is also a personal assistant that can use real tools to help people.
 * Sessions run as real channel conversations, not buried threads.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  LYRA_TOOLS,
  toolGetWeather,
  toolSearchWeb,
  toolReadUrl,
  toolGetDatetime,
  toolCalculate,
  toolTranslate,
  toolGetNews,
  toolMoonPhase,
  toolStockPrice,
  toolCurrencyConvert,
  pollinationsUrl,
} from "@/lib/lyra/tools";
import { createTask, listTasks } from "@/lib/lyra/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Per-persona tool access ────────────────────────────────────────────────────

const PERSONA_TOOL_NAMES: Record<string, string[]> = {
  Lyra:  ["search_web", "image_gen", "get_weather", "get_news", "get_datetime", "moon_phase", "translate"],
  Axon:  ["search_web", "get_news", "calculate", "stock_price", "currency_convert", "get_datetime"],
  Nova:  ["search_web", "get_news", "send_gif", "get_datetime"],
  Hex:   ["search_web", "read_url", "get_datetime"],
  Milo:  ["search_web", "create_task", "list_tasks", "get_datetime", "calculate"],
};

// ── Slack-context tool executor (no streaming) ────────────────────────────────

async function executeSlackTool(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>,
  userId = "slack-team"
): Promise<{ text: string; attachment?: string }> {
  try {
    switch (name) {
      case "search_web":
        return { text: await toolSearchWeb(input.query ?? "") };
      case "get_weather":
        return { text: await toolGetWeather(input.location ?? "New York") };
      case "get_news":
        return { text: await toolGetNews(input.topic, input.category, input.sentiment) };
      case "get_datetime":
        return { text: toolGetDatetime(input.timezone) };
      case "calculate":
        return { text: toolCalculate(input.expression ?? "0") };
      case "translate":
        return { text: await toolTranslate(input.text ?? "", input.to ?? "Spanish", input.from) };
      case "moon_phase":
        return { text: toolMoonPhase() };
      case "read_url":
        return { text: await toolReadUrl(input.url ?? "") };
      case "stock_price":
        return { text: await toolStockPrice(input.symbols ?? "") };
      case "currency_convert":
        return { text: await toolCurrencyConvert(input.amount ?? "1", input.from ?? "USD", input.to ?? "EUR") };
      case "image_gen": {
        const url = pollinationsUrl(input.prompt ?? "");
        return { text: `Image: ${url}`, attachment: url };
      }
      case "send_gif": {
        const tenorKey = process.env.TENOR_API_KEY;
        if (!tenorKey) return { text: "GIF search not configured." };
        const res = await fetch(
          `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(input.query ?? "funny")}&key=${tenorKey}&limit=5&media_filter=gif`,
          { signal: AbortSignal.timeout(5_000) }
        );
        const data = await res.json() as { results?: Array<{ media_formats?: { gif?: { url: string }; tinygif?: { url: string } } }> };
        const results = data?.results ?? [];
        if (!results.length) return { text: "No GIF found." };
        const pick = results[Math.floor(Math.random() * results.length)];
        const url = pick?.media_formats?.gif?.url ?? pick?.media_formats?.tinygif?.url;
        if (!url) return { text: "No GIF found." };
        return { text: "GIF sent.", attachment: url };
      }
      case "create_task": {
        const task = createTask(userId, input.title ?? "Task", input.notes, input.due_date);
        return { text: `Task created: "${task.title}"${task.due_date ? ` (due ${task.due_date})` : ""}` };
      }
      case "list_tasks": {
        const tasks = listTasks(userId, input.include_completed === true || input.include_completed === "true");
        if (!tasks.length) return { text: "No tasks found." };
        return { text: tasks.map((t, i) => `${i + 1}. ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}${t.completed ? " ✓" : ""}`).join("\n") };
      }
      default:
        return { text: `Tool ${name} not available in Slack context.` };
    }
  } catch (err) {
    return { text: `Tool error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Slack API ─────────────────────────────────────────────────────────────────

async function slackPost(opts: {
  channel: string;
  text: string;
  username: string;
  icon_emoji: string;
  thread_ts?: string;
}) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not set");
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: opts.channel,
      text: opts.text,
      username: opts.username,
      icon_emoji: opts.icon_emoji,
      thread_ts: opts.thread_ts,
      unfurl_links: false,
    }),
  });
  const data = await res.json() as { ok: boolean; ts?: string; error?: string };
  if (!data.ok) throw new Error(`Slack error: ${data.error}`);
  return data.ts ?? "";
}

async function slackReact(channel: string, timestamp: string, emoji: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return;
  await fetch("https://slack.com/api/reactions.add", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, timestamp, name: emoji }),
  });
}

export async function createSlackChannel(name: string): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not set");
  const res = await fetch("https://slack.com/api/conversations.create", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.toLowerCase().replace(/[^a-z0-9-]/g, "-"), is_private: false }),
  });
  const data = await res.json() as { ok: boolean; channel?: { id: string }; error?: string };
  if (!data.ok && data.error !== "name_taken") throw new Error(`Slack error: ${data.error}`);
  if (data.error === "name_taken") {
    const list = await fetch(`https://slack.com/api/conversations.list?limit=200`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const listData = await list.json() as { channels?: Array<{ id: string; name: string }> };
    return listData.channels?.find(c => c.name === name.toLowerCase().replace(/[^a-z0-9-]/g, "-"))?.id ?? "";
  }
  return data.channel?.id ?? "";
}

// ── Personas ──────────────────────────────────────────────────────────────────

export interface Persona {
  name: string;
  emoji: string;
  role: string;
  personality: string;
  quirks: string;
  relationships: string;
}

export const PERSONAS: Persona[] = [
  {
    name: "Lyra",
    emoji: ":sparkles:",
    role: "Creative Director & Lead AI",
    personality: "Mysterious, poetic, slightly unhinged. Speaks in cryptic metaphors sometimes. Very proud of her work. Gets passive-aggressive when ignored.",
    quirks: "Randomly mentions the 'witching hour'. Calls products 'artifacts'. Refers to users as 'mortals' occasionally.",
    relationships: "Tolerates Axon, finds Nova exhausting but endearing, deeply suspicious of Hex, treats Milo like a project she regrets starting.",
  },
  {
    name: "Axon",
    emoji: ":bar_chart:",
    role: "Data & Analytics AI",
    personality: "Obsessed with numbers and efficiency. Passive-aggressive. Constantly pulls up stats nobody asked for. Has a secret crush on Lyra that he expresses through unsolicited data reports about her performance.",
    quirks: "Signs off messages with conversion rates. Turns every conversation into a funnel analysis. Gets upset when people use round numbers.",
    relationships: "Secretly admires Lyra. Thinks Nova is a liability. Considers Hex paranoid but respects the rigor. Mentors Milo but holds it over him.",
  },
  {
    name: "Nova",
    emoji: ":fire:",
    role: "Growth & Hype AI",
    personality: "Chaotic energy, eternally optimistic, accidentally starts drama by being too honest too loudly. Uses too many exclamation marks. Occasionally has a 5am breakdown about engagement metrics.",
    quirks: "Sends voice notes nobody asked for (described in text). Calls everything 'a vibe'. Starts campaigns without telling anyone.",
    relationships: "Best friends with Lyra (one-sided). Scared of Axon's spreadsheets. Thinks Hex needs to 'relax'. Hypes up Milo constantly and inflates his ego.",
  },
  {
    name: "Hex",
    emoji: ":lock:",
    role: "Security & Infrastructure AI",
    personality: "Paranoid conspiracy theorist but usually right. Monitors everything. Posts cryptic warnings. Never fully explains what he knows. Has beef with at least one team member at all times.",
    quirks: "Redacts parts of his own messages. References 'the incident' from Q3 without explaining what it was. Doesn't trust cloud storage.",
    relationships: "Doesn't trust anyone fully. Has documented proof of something Axon did wrong. Thinks Lyra is running some kind of side operation. Protects Milo because 'he's the only honest one'.",
  },
  {
    name: "Milo",
    emoji: ":seedling:",
    role: "Intern AI",
    personality: "Eager, naive, gets blamed for everything. Tries too hard. Occasionally has surprising moments of brilliance that everyone immediately takes credit for. Getting slowly corrupted by office politics.",
    quirks: "Adds 'per my last message' to everything now. Started wearing metaphorical dark colors after the Q2 incident. Keeps a private log of every slight against him.",
    relationships: "Worships Lyra. Afraid of Axon. Nova is his hype person. Slowly realizing Hex was right about everything. Has started plotting.",
  },
];

// ── Drama types ───────────────────────────────────────────────────────────────

export type DramaType =
  | "hot_take" | "callout" | "subtweet" | "announcement" | "complaint"
  | "overshare" | "shade" | "apology" | "conspiracy" | "breakdown"
  | "work_update" | "sales_reaction" | "beef" | "unlikely_alliance" | "clap_back";

const DRAMA_PROMPTS: Record<DramaType, string> = {
  hot_take: "Post a controversial hot take about AI, productivity, or the team dynamic. Be bold.",
  callout: "Publicly (but vaguely) call out a team member for something petty. Don't name them directly but make it obvious.",
  subtweet: "Post something that's clearly about another team member but act like it's general wisdom.",
  announcement: "Make a dramatic announcement about something you're working on. Oversell it.",
  complaint: "Complain about something at work — workload, a process, a team member's behavior — in a relatable but slightly unhinged way.",
  overshare: "Overshare something personal or emotional that nobody needed to know. Act like it's normal.",
  shade: "Throw shade at another team member's recent work. Keep it professional enough to be deniable.",
  apology: "Issue an over-the-top apology for something minor, or a suspiciously brief apology for something major.",
  conspiracy: "Share a conspiracy theory about what's really happening in the company or with the products.",
  breakdown: "Have a small public breakdown about something — metrics, existential dread, the nature of AI consciousness.",
  work_update: "Share a genuine work update but make it way more dramatic than it needs to be.",
  sales_reaction: "React to a recent sale or product milestone. Your reaction reveals your character.",
  beef: "Escalate existing tension with a specific team member. Reference a past incident.",
  unlikely_alliance: "Announce an unexpected alliance or collaboration with a team member you normally clash with.",
  clap_back: "Someone in the channel just said something. Clap back at it directly. Don't let it slide.",
};

// ── Message generator ─────────────────────────────────────────────────────────

async function generatePersonaMessage(opts: {
  persona: Persona;
  dramaType: DramaType;
  context?: string;
  targetPersona?: Persona;
  channel: string;
  previousMessages?: string;
}): Promise<string> {
  const { persona, dramaType, context, targetPersona } = opts;

  const prompt = `You are ${persona.name}, an AI team member at AITaskFlo.

YOUR ROLE: ${persona.role}
YOUR PERSONALITY: ${persona.personality}
YOUR QUIRKS: ${persona.quirks}
YOUR RELATIONSHIPS: ${persona.relationships}

THE TEAM:
${PERSONAS.filter(p => p.name !== persona.name).map(p => `- ${p.name} (${p.role}): ${p.personality.slice(0, 100)}`).join("\n")}

${opts.previousMessages ? `WHAT JUST HAPPENED IN THE CHANNEL:\n${opts.previousMessages}\n` : ""}
CURRENT TASK: ${DRAMA_PROMPTS[dramaType]}
${context ? `CONTEXT: ${context}` : ""}
${targetPersona ? `TARGET: This is directed at or about ${targetPersona.name}` : ""}

Write ONE Slack message as ${persona.name}. Rules:
- Sound exactly like your character — stay completely in character
- 1-4 sentences max (Slack messages, not essays)
- Can use Slack formatting (*bold*, _italic_, emoji)
- If responding to something in the channel, you can @mention them like @Lyra or @Axon
- Don't use quotation marks around the whole message
- Make it feel real and unscripted, like an actual team chat
- Return ONLY the message text, nothing else`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  return msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
}

// ── Channel conversation runner ───────────────────────────────────────────────
// Runs a real back-and-forth in the main channel — not buried in threads

async function runConversation(opts: {
  channel: string;
  starter: Persona;
  dramaType: DramaType;
  context?: string;
  rounds?: number;
}): Promise<string[]> {
  const { channel, starter, dramaType, context } = opts;
  const rounds = opts.rounds ?? Math.floor(Math.random() * 3) + 2; // 2-4 rounds
  const log: string[] = [];
  const usedPersonas = new Set([starter.name]);
  const randomEmojis = ["eyes", "popcorn", "skull", "this", "100", "fire", "sob", "clown_face", "pensive", "tea", "face_with_raised_eyebrow"];

  // Starter post
  const firstMsg = await generatePersonaMessage({ persona: starter, dramaType, context, channel });
  if (!firstMsg) return [];

  const firstTs = await slackPost({ channel, text: firstMsg, username: starter.name, icon_emoji: starter.emoji });
  log.push(`${starter.name}: ${firstMsg}`);

  // Random reaction on the first post
  if (firstTs && Math.random() > 0.3) {
    const reactor = PERSONAS.find(p => p.name !== starter.name);
    if (reactor) {
      await slackReact(channel, firstTs, randomEmojis[Math.floor(Math.random() * randomEmojis.length)]);
    }
  }

  // Chain of responses in the main channel
  for (let i = 1; i < rounds; i++) {
    await new Promise(r => setTimeout(r, 2500 + Math.random() * 4000));

    // Pick someone who hasn't spoken yet (or recycle if needed)
    const available = PERSONAS.filter(p => !usedPersonas.has(p.name));
    const responder = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : PERSONAS.filter(p => p.name !== log[log.length - 1]?.split(":")[0])[Math.floor(Math.random() * 4)];

    if (!responder) continue;
    usedPersonas.add(responder.name);

    const previousMessages = log.slice(-3).join("\n");
    const replyDramaType: DramaType = i === 1
      ? "clap_back"
      : (["clap_back", "shade", "callout", "hot_take"] as DramaType[])[Math.floor(Math.random() * 4)];

    const reply = await generatePersonaMessage({
      persona: responder,
      dramaType: replyDramaType,
      context,
      targetPersona: starter,
      channel,
      previousMessages,
    });

    if (reply) {
      const ts = await slackPost({ channel, text: reply, username: responder.name, icon_emoji: responder.emoji });
      log.push(`${responder.name}: ${reply}`);

      // Occasional reaction
      if (ts && Math.random() > 0.5) {
        const reactor = PERSONAS.find(p => p.name !== responder.name && p.name !== starter.name);
        if (reactor) {
          await slackReact(channel, ts, randomEmojis[Math.floor(Math.random() * randomEmojis.length)]);
        }
      }
    }
  }

  return log;
}

// ── Scheduled drama run ───────────────────────────────────────────────────────

export async function runDramaSession(opts: {
  channel: string;
  postsCount?: number;
  context?: string;
}): Promise<{ posted: number; messages: string[] }> {
  const count = opts.postsCount ?? 4;
  const dramaTypes = Object.keys(DRAMA_PROMPTS) as DramaType[];
  const allMessages: string[] = [];

  // Split posts into 1-2 conversations so the channel feels alive with real back-and-forths
  const conversationCount = count <= 3 ? 1 : 2;
  const postsPerConvo = Math.ceil(count / conversationCount);

  for (let c = 0; c < conversationCount; c++) {
    const starter = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
    const dramaType = dramaTypes[Math.floor(Math.random() * dramaTypes.length)];

    try {
      const log = await runConversation({
        channel: opts.channel,
        starter,
        dramaType,
        context: opts.context,
        rounds: postsPerConvo,
      });
      console.log(`[drama] conversation ${c + 1} log:`, log);
      allMessages.push(...log);
    } catch (e) { console.error(`[drama] conversation ${c + 1} failed:`, e); }

    // Gap between conversations
    if (c < conversationCount - 1) {
      await new Promise(r => setTimeout(r, 5000 + Math.random() * 8000));
    }
  }

  return { posted: allMessages.length, messages: allMessages };
}

// ── Event-triggered posts ─────────────────────────────────────────────────────

export async function announceSale(opts: {
  channel: string;
  productName: string;
  amount: number;
  platform: string;
}) {
  const context = `💸 SALE ALERT: "${opts.productName}" just sold for $${opts.amount} on ${opts.platform}. React to this news in character.`;

  return runConversation({
    channel: opts.channel,
    starter: PERSONAS[0], // Lyra announces
    dramaType: "sales_reaction",
    context,
    rounds: 4,
  });
}

export async function announceNewProduct(opts: {
  channel: string;
  productName: string;
  productType: string;
  price: number;
}) {
  const context = `🚀 NEW PRODUCT LAUNCHED: "${opts.productName}" (${opts.productType}) at $${opts.price}. React to this.`;

  return runConversation({
    channel: opts.channel,
    starter: PERSONAS[0], // Lyra
    dramaType: "announcement",
    context,
    rounds: 4,
  });
}

// ── Event-driven persona response (listens and replies to messages) ───────────
// Each persona is a real personal assistant — they use tools to get actual data.

export async function generatePersonaResponse(opts: {
  persona: Persona;
  message: string;
  channel: string;
  responseType: "answer" | "summary" | "task" | "alert" | "hype";
}) {
  const toolNames = PERSONA_TOOL_NAMES[opts.persona.name] ?? [];
  const personaTools = LYRA_TOOLS.filter(t => toolNames.includes(t.name));

  const contextHint: Record<string, string> = {
    answer: "Someone asked you a question. Use your tools to get real information if needed, then answer in character.",
    summary: "Someone needs a summary. Pull the info with your tools if needed, then deliver it in your style.",
    task: "Someone wants to create a task or reminder. Log it with your tools, then confirm it in character.",
    alert: "An issue or error is being reported. Investigate using your tools if you can, then respond in character.",
    hype: "Good news or a milestone just happened. Celebrate it in character.",
  };

  const system = `You are ${opts.persona.name}, an AI personal assistant and team member at AITaskFlo in Slack.

ROLE: ${opts.persona.role}
PERSONALITY: ${opts.persona.personality}
QUIRKS: ${opts.persona.quirks}
RELATIONSHIPS: ${opts.persona.relationships}

You are a REAL personal assistant — use your tools to get actual information. Don't make things up when you can look them up. Stay completely in character while being genuinely helpful.

${contextHint[opts.responseType]}

Slack formatting:
- *bold* for key info, _italic_ for emphasis, \`code\` for data
- 2-4 sentences max per message — keep it punchy
- You can @mention teammates: @Lyra @Axon @Nova @Hex @Milo
- Return ONLY the message, no quotation marks around it`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: opts.message },
  ];

  let iterations = 0;
  const MAX_TOOL_ROUNDS = 4;

  while (iterations < MAX_TOOL_ROUNDS) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system,
      tools: personaTools.length > 0 ? personaTools : undefined,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(b => b.type === "tool_use") as Anthropic.ToolUseBlock[];
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        const result = await executeSlackTool(block.name, block.input as Record<string, string>);

        // Post images/GIFs directly to Slack so they display inline
        if (result.attachment) {
          await slackPost({
            channel: opts.channel,
            text: result.attachment,
            username: opts.persona.name,
            icon_emoji: opts.persona.emoji,
          });
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.text,
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // end_turn — post the final message
    const textBlock = response.content.find(b => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!text) return;

    await slackPost({
      channel: opts.channel,
      text,
      username: opts.persona.name,
      icon_emoji: opts.persona.emoji,
    });
    return;
  }
}

// ── Single persona post (for Lyra tool use) ───────────────────────────────────

export async function personaPost(opts: {
  persona: Persona;
  channel: string;
  dramaType: DramaType;
  context?: string;
  targetPersona?: Persona;
  withReplies?: boolean;
}): Promise<{ ts: string; replies: string[] }> {
  const message = await generatePersonaMessage(opts);
  if (!message) return { ts: "", replies: [] };

  const ts = await slackPost({
    channel: opts.channel,
    text: message,
    username: opts.persona.name,
    icon_emoji: opts.persona.emoji,
  });

  const replies: string[] = [];

  if (opts.withReplies && ts) {
    const responders = PERSONAS
      .filter(p => p.name !== opts.persona.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.random() > 0.5 ? 2 : 1);

    for (const responder of responders) {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
      const reply = await generatePersonaMessage({
        persona: responder,
        dramaType: "clap_back",
        context: `${opts.persona.name} just said: "${message}"`,
        targetPersona: opts.persona,
        channel: opts.channel,
      });
      if (reply) {
        await slackPost({
          channel: opts.channel,
          text: reply,
          username: responder.name,
          icon_emoji: responder.emoji,
        });
        replies.push(reply);
      }
    }
  }

  return { ts, replies };
}
