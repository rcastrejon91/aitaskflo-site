import { NextRequest, NextResponse } from "next/server";
import { getPendingAction, deletePendingAction } from "@/lib/lyra/pending-actions";
import {
  toolGmailSend,
  toolCalendarCreateEvent,
  toolDriveWrite,
} from "@/lib/lyra/google-tools";
import { toolSendEmail, toolSendSms } from "@/lib/lyra/tools";

export async function POST(req: NextRequest) {
  const body = await req.json() as { id: string; action: "confirm" | "cancel" };
  const { id, action } = body;

  if (!id || !action) {
    return NextResponse.json({ success: false, error: "Missing id or action." }, { status: 400 });
  }

  const pending = getPendingAction(id);
  if (!pending) {
    return NextResponse.json({ success: false, error: "Action expired or not found." }, { status: 404 });
  }

  deletePendingAction(id);

  if (action === "cancel") {
    return NextResponse.json({ success: true, result: "Got it — action cancelled." });
  }

  // Execute the real tool
  try {
    let result: string;
    const { tool, input, userId } = pending;

    if (tool === "gmail_send") {
      if (!userId) return NextResponse.json({ success: false, error: "Login required." }, { status: 401 });
      result = await toolGmailSend(userId, input.to ?? "", input.subject ?? "", input.body ?? "");
    } else if (tool === "calendar_create") {
      if (!userId) return NextResponse.json({ success: false, error: "Login required." }, { status: 401 });
      result = await toolCalendarCreateEvent(
        userId,
        input.summary ?? "",
        input.start ?? "",
        input.end ?? "",
        input.description
      );
    } else if (tool === "drive_write") {
      if (!userId) return NextResponse.json({ success: false, error: "Login required." }, { status: 401 });
      result = await toolDriveWrite(userId, input.name ?? "", input.content ?? "", input.mime_type);
    } else if (tool === "send_sms") {
      result = await toolSendSms(input.to ?? "", input.message ?? "");
    } else if (tool === "send_email") {
      result = await toolSendEmail(input.to ?? "", input.subject ?? "", input.body ?? "");
    } else {
      return NextResponse.json({ success: false, error: `Unknown tool: ${tool}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
