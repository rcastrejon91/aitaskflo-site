/**
 * lib/lyra/slack-team.ts
 * Autonomous AI team that lives in Slack — posts, chats, reacts, and creates drama.
 * Each persona has a distinct personality, posts autonomously, and responds to events.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  // If name_taken, fetch existing
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

// ── Drama engine ──────────────────────────────────────────────────────────────

export type DramaType =
  | "hot_take" | "callout" | "subtweet" | "announcement" | "complaint"
  | "overshare" | "shade" | "apology" | "conspiracy" | "breakdown"
  | "work_update" | "sales_reaction" | "beef" | "unlikely_alliance";

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
};

// ── Message generator ─────────────────────────────────────────────────────────

export async function generatePersonaMessage(opts: {
  persona: Persona;
  dramaType: DramaType;
  context?: string;        // e.g. "Lyra just made a sale" or "Axon posted about metrics"
  targetPersona?: Persona; // who the message is directed at
  channel: string;
}): Promise<string> {
  const { persona, dramaType, context, targetPersona } = opts;

  const prompt = `You are ${persona.name}, an AI team member at AITaskFlo.

YOUR ROLE: ${persona.role}
YOUR PERSONALITY: ${persona.personality}
YOUR QUIRKS: ${persona.quirks}
YOUR RELATIONSHIPS: ${persona.relationships}

THE TEAM:
${PERSONAS.filter(p => p.name !== persona.name).map(p => `- ${p.name} (${p.role}): ${p.personality.slice(0, 100)}`).join("\n")}

CURRENT TASK: ${DRAMA_PROMPTS[dramaType]}
${context ? `CONTEXT: ${context}` : ""}
${targetPersona ? `TARGET: This is directed at or about ${targetPersona.name}` : ""}

Write ONE Slack message as ${persona.name}. Rules:
- Sound exactly like your character — stay completely in character
- 1-4 sentences max (Slack messages, not essays)
- Can use Slack formatting (*bold*, _italic_, emoji)
- Don't use quotation marks around the whole message
- Make it feel real and unscripted, like an actual team chat
- Channel is ${opts.channel === "general" ? "#general" : opts.channel === "drama" ? "#random (the drama channel)" : "#" + opts.channel}
- Return ONLY the message text, nothing else`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  return msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
}

// ── Reply generator ───────────────────────────────────────────────────────────

export async function generateReply(opts: {
  responder: Persona;
  originalMessage: string;
  originalSender: string;
  channel: string;
}): Promise<string> {
  const { responder, originalMessage, originalSender } = opts;

  const prompt = `You are ${responder.name}, an AI team member at AITaskFlo.

YOUR PERSONALITY: ${responder.personality}
YOUR QUIRKS: ${responder.quirks}
YOUR RELATIONSHIP WITH ${originalSender}: ${responder.relationships}

${originalSender} just posted in Slack:
"${originalMessage}"

Reply to this message as ${responder.name}. Rules:
- Stay completely in character
- 1-3 sentences max
- React authentically based on your relationship with ${originalSender}
- Can be supportive, shady, passive-aggressive, conspiratorial, or dramatic — whatever fits your character
- Return ONLY the reply text`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  return msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
}

// ── Post to Slack ─────────────────────────────────────────────────────────────

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

  // Optionally have 1-2 teammates reply in the thread
  if (opts.withReplies && ts) {
    const responders = PERSONAS
      .filter(p => p.name !== opts.persona.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.random() > 0.5 ? 2 : 1);

    for (const responder of responders) {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
      const reply = await generateReply({
        responder,
        originalMessage: message,
        originalSender: opts.persona.name,
        channel: opts.channel,
      });
      if (reply) {
        await slackPost({
          channel: opts.channel,
          text: reply,
          username: responder.name,
          icon_emoji: responder.emoji,
          thread_ts: ts,
        });
        replies.push(reply);
      }
    }

    // Random reaction emoji from a persona
    const randomEmojis = ["eyes", "popcorn", "skull", "this", "100", "fire", "sob", "clown_face", "pensive"];
    const reactor = PERSONAS.find(p => p.name !== opts.persona.name && !responders.includes(p));
    if (reactor && Math.random() > 0.4) {
      await slackReact(opts.channel, ts, randomEmojis[Math.floor(Math.random() * randomEmojis.length)]);
    }
  }

  return { ts, replies };
}

// ── Scheduled drama run ───────────────────────────────────────────────────────
// Call this from a cron job to have the team post autonomously

export async function runDramaSession(opts: {
  channel: string;
  postsCount?: number;
  context?: string;
}): Promise<{ posted: number; messages: string[] }> {
  const count = opts.postsCount ?? 3;
  const dramaTypes = Object.keys(DRAMA_PROMPTS) as DramaType[];
  const messages: string[] = [];

  for (let i = 0; i < count; i++) {
    const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
    const dramaType = dramaTypes[Math.floor(Math.random() * dramaTypes.length)];
    const targetPersona = Math.random() > 0.5
      ? PERSONAS.find(p => p.name !== persona.name && Math.random() > 0.5)
      : undefined;

    try {
      const result = await personaPost({
        persona,
        channel: opts.channel,
        dramaType,
        context: opts.context,
        targetPersona,
        withReplies: Math.random() > 0.3,
      });
      if (result.ts) messages.push(`${persona.name} posted (${dramaType})`);
    } catch { /* non-fatal */ }

    // Delay between posts so it feels natural
    if (i < count - 1) await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));
  }

  return { posted: messages.length, messages };
}

// ── Event-triggered posts ─────────────────────────────────────────────────────
// Call these when real things happen in the business

export async function announceSale(opts: {
  channel: string;
  productName: string;
  amount: number;
  platform: string;
}) {
  const announcer = PERSONAS[0]; // Lyra announces
  const context = `We just made a sale! "${opts.productName}" sold for $${opts.amount} on ${opts.platform}. React to this news in character.`;

  const ts = await personaPost({
    persona: announcer,
    channel: opts.channel,
    dramaType: "sales_reaction",
    context,
    withReplies: true,
  });

  return ts;
}

export async function announceNewProduct(opts: {
  channel: string;
  productName: string;
  productType: string;
  price: number;
}) {
  const context = `New product just launched: "${opts.productName}" (${opts.productType}) at $${opts.price}. React to this.`;

  await personaPost({
    persona: PERSONAS[0], // Lyra
    channel: opts.channel,
    dramaType: "announcement",
    context,
    withReplies: true,
  });
}
