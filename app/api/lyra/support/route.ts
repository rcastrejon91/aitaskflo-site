import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toolSendSms } from "@/lib/lyra/tools";
import { toolSendEmail } from "@/lib/lyra/tools";

async function lyraTriageIssue(issue: string, userEmail: string): Promise<{
  fixed: boolean;
  response: string;
}> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: `You are Lyra, the AI behind AITaskFlo. A user just reported an issue. Try to diagnose and fix it yourself.

AITaskFlo features: Lyra chat (/lyra), Ghost Writer (/write), Business OS (/business), Games (/games), Feed (/feed), Memory (/memory), Searches (/searches), Biz portal (/biz), Book writer (/book), Trucker tools (/trucker), Demo (/demo).

Common fixes:
- Page not loading → hard refresh (Ctrl+Shift+R), clear cache, try incognito
- Not saving → check if logged in, try refreshing
- Chat not responding → refresh the page, check internet connection
- Can't upload files → check file type (TXT, CSV, MD, HTML, JSON only, max 5MB)
- Login issues → try password reset, check email for verification
- Subscription issues → check /account page

Respond with JSON only:
{
  "fixed": true/false,
  "response": "your response to the user"
}

If you can give a real actionable fix → fixed: true
If it needs human investigation or you genuinely can't resolve it → fixed: false
Keep response conversational, 1-3 sentences. Don't say "I" — you're Lyra.`,
    messages: [{ role: "user", content: `User issue: ${issue}\nUser email: ${userEmail}` }],
  });

  try {
    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { fixed?: boolean; response?: string };
    return {
      fixed: json.fixed ?? false,
      response: json.response ?? "Looking into this now.",
    };
  } catch {
    return { fixed: false, response: "Something went wrong diagnosing this. Escalating to the team." };
  }
}

async function escalateToTeam(issue: string, userEmail: string, lyraResponse: string) {
  const adminPhone = process.env.ADMIN_PHONE;
  const adminEmail = process.env.GMAIL_USER;
  const msg = `Support ticket\nFrom: ${userEmail}\nIssue: ${issue}\nLyra tried: ${lyraResponse}`;

  if (adminPhone && process.env.TWILIO_ACCOUNT_SID) {
    await toolSendSms(adminPhone, `🎫 ${msg}`).catch(() => {});
  }
  if (adminEmail) {
    await toolSendEmail(adminEmail, `Support Ticket: ${issue.slice(0, 60)}`, msg).catch(() => {});
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userEmail = (session?.user as { email?: string })?.email ?? "anonymous";

  const { issue } = await req.json().catch(() => ({})) as { issue: string };
  if (!issue?.trim()) return NextResponse.json({ error: "No issue provided" }, { status: 400 });

  const triage = await lyraTriageIssue(issue.trim(), userEmail);

  if (!triage.fixed) {
    await escalateToTeam(issue.trim(), userEmail, triage.response);
  }

  return NextResponse.json({ fixed: triage.fixed, response: triage.response });
}
