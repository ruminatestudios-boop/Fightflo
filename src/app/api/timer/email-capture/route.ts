import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/email/validate";
import { createLoopsContact } from "@/lib/loops";
import { recordEmailCapture } from "@/lib/db/email-captures";
import type { EmailCaptureSource } from "@/lib/boxing-timer/email-capture-storage";

export const runtime = "nodejs";

const SOURCES = new Set<EmailCaptureSource>([
  "post_session",
  "banner",
  "round3",
]);

export async function POST(request: Request) {
  let body: {
    email?: string;
    source?: string;
    timerSessionsBeforeCapture?: number;
    deviceId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "Double check that email" },
      { status: 400 }
    );
  }

  const source = body.source as EmailCaptureSource;
  if (!source || !SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const timerSessionsBeforeCapture = Math.max(
    0,
    body.timerSessionsBeforeCapture ?? 0
  );

  const loops = await createLoopsContact(email, source);

  try {
    await recordEmailCapture({
      email,
      capturedFrom: source,
      timerSessionsBeforeCapture,
      deviceId: body.deviceId?.trim() || undefined,
    });
  } catch (err) {
    console.error("[email-capture] db write failed:", err);
  }

  if (!loops.ok && !loops.skipped) {
    return NextResponse.json(
      {
        error: "api_fail",
        message: "Something went wrong — try fightflo.app/bag directly",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, loops: loops.ok || loops.skipped });
}
