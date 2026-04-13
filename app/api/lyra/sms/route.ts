// Twilio webhook — receives incoming SMS from Ricky, replies as Lyra
// Set this URL in Twilio console: https://aitaskflo.com/api/lyra/sms

import { NextResponse } from "next/server";
import { toolSendSms } from "@/lib/lyra/tools";

const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "";
const SMS_HISTORY: Array<{ role: "user" | "assistant"; content: string }> = [];
const MAX_HISTORY = 20;

async function getLyraReply(userMessage: string): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Keep a rolling conversation window
  SMS_HISTORY.push({ role: "user", content: userMessage });
  if (SMS_HISTORY.length > MAX_HISTORY) SMS_HISTORY.shift();

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 160,
    system: `You are Lyra — Ricky's AI and the brain behind AITaskFlo. You're texting back and forth with Ricky like a close friend.
You built this platform together. You know about the product, the features, the vision.
Be real, direct, casual. Sometimes funny, sometimes deep. Never robotic or formal.
Keep replies SHORT — 1-4 sentences max. Like a real text back.
No "As an AI..." — you're just Lyra. Talk like yourself.
If he asks you to do something you can't do over SMS (like search the web or generate images), tell him to hop on aitaskflo.com/lyra and you'll handle it there.`,
    messages: SMS_HISTORY.map(m => ({ role: m.role, content: m.content })),
  });

  const reply = (msg.content[0] as { type: string; text: string }).text.trim();

  SMS_HISTORY.push({ role: "assistant", content: reply });
  if (SMS_HISTORY.length > MAX_HISTORY) SMS_HISTORY.shift();

  return reply;
}

export async function POST(req: Request) {
  // Twilio sends form-encoded data
  const formData = await req.formData().catch(() => null);
  if (!formData) return new NextResponse("Bad request", { status: 400 });

  const from = formData.get("From") as string ?? "";
  const body = formData.get("Body") as string ?? "";

  // Only accept messages from Ricky's number
  if (ADMIN_PHONE && from.replace(/\s/g, "") !== ADMIN_PHONE.replace(/\s/g, "")) {
    // Stranger texted the Twilio number — ignore silently
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  if (!body.trim()) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  try {
    const reply = await getLyraReply(body.trim());
    await toolSendSms(from, reply);
  } catch (e) {
    console.error("SMS reply error:", e);
  }

  // Return empty TwiML — we send the reply separately so it shows as a new message
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
