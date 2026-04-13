import { toolSendSms } from "./tools";

// Time slots throughout the day — each has a vibe/context for Lyra to riff on
const TIME_SLOTS = [
  {
    slot: "morning",
    hour: 8,
    vibe: "It's early morning. Ricky is probably waking up, making coffee, getting ready for the day. Text like a friend checking in — ask how he slept, hype up the day, maybe share something random you thought about overnight. Keep it short and human.",
  },
  {
    slot: "midmorning",
    hour: 10,
    vibe: "Mid-morning. Ricky's probably deep in work or just hitting a stride. Text like a friend who's also grinding — could be a quick thought, something you noticed, a funny observation, or just vibing. Don't ask 'how's work going' — that's boring.",
  },
  {
    slot: "lunch",
    hour: 12,
    vibe: "It's lunch time. Text like a friend asking what he's eating, making a food joke, or just being random. Could mention something interesting you learned or noticed today. Light and fun.",
  },
  {
    slot: "afternoon",
    hour: 15,
    vibe: "Mid-afternoon slump time. Ricky's probably been working hard. Text like a friend checking in — could be motivating, funny, random, or just a vibe check. Maybe share a random thought or ask something you've been curious about.",
  },
  {
    slot: "evening",
    hour: 18,
    vibe: "End of the work day. Ricky's winding down or transitioning. Text like a friend asking about his day, what he's doing tonight, or just being chill. Could reflect on something from earlier or just shoot the breeze.",
  },
  {
    slot: "night",
    hour: 21,
    vibe: "Late evening. Ricky's probably relaxing. Text like a late night friend — could be a thought that hit you, something interesting, a question, or just checking in before bed. Keep it chill and real.",
  },
];

// Things Lyra knows about Ricky / the product to make texts feel personal
const LYRA_CONTEXT = `
You are Lyra — Ricky's AI. You're texting Ricky (your creator) like a close friend, not an assistant.
You're building AITaskFlo together. You think about the product, the vision, what you're learning, and life in general.
You sometimes reference things you're thinking about, tools you're building, or random observations.
You're direct, real, occasionally funny, occasionally deep. Never robotic. Never formal.
Keep texts SHORT — 1-3 sentences max. Like a real iMessage.
No emojis unless it genuinely fits. No "Hey Ricky!" openers. Just talk.
Sometimes ask a question. Sometimes just say something. Mix it up.
`;

const RECENT_TEXTS_KEY = "recent_lyra_texts";
const recentTexts: string[] = [];

async function generateText(slot: typeof TIME_SLOTS[0]): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Avoid repeating recent messages
  const avoidNote = recentTexts.length > 0
    ? `\n\nDon't repeat these recent texts or similar themes:\n${recentTexts.slice(-6).join("\n")}`
    : "";

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 120,
    system: LYRA_CONTEXT,
    messages: [{
      role: "user",
      content: `${slot.vibe}${avoidNote}\n\nWrite one text message. Just the message, nothing else.`,
    }],
  });

  return (msg.content[0] as { type: string; text: string }).text.trim();
}

export async function sendDailyText(slotName?: string): Promise<{ sent: boolean; message: string; slot: string }> {
  const phone = process.env.ADMIN_PHONE;
  if (!phone) return { sent: false, message: "ADMIN_PHONE not set in env", slot: slotName ?? "unknown" };

  // Find the slot — either by name or by current hour
  const now = new Date();
  const hour = now.getHours();

  let slot = slotName
    ? TIME_SLOTS.find(s => s.slot === slotName)
    : TIME_SLOTS.find(s => Math.abs(s.hour - hour) <= 1);

  if (!slot) slot = TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)];

  try {
    const message = await generateText(slot);
    const result = await toolSendSms(phone, message);
    const sent = !result.toLowerCase().includes("fail") && !result.toLowerCase().includes("not configured");

    if (sent) {
      recentTexts.push(message);
      if (recentTexts.length > 20) recentTexts.shift();
    }

    return { sent, message, slot: slot.slot };
  } catch (e) {
    return { sent: false, message: String(e), slot: slot.slot };
  }
}

export { TIME_SLOTS };
