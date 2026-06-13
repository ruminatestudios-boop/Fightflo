import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/email/validate";
import { createComingSoonLoopsContact } from "@/lib/loops";
import {
  getComingSoonWaitlistCount,
  recordComingSoonCapture,
} from "@/lib/db/coming-soon-captures";
import { normalizeComingSoonInterests } from "@/lib/bag-drill/coming-soon-interests";

export const runtime = "nodejs";

export async function GET() {
  const count = await getComingSoonWaitlistCount();
  return NextResponse.json({ count });
}

export async function POST(request: Request) {
  let body: {
    email?: string;
    deviceId?: string;
    interestedIn?: unknown;
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

  const interestedIn = normalizeComingSoonInterests(body.interestedIn);
  if (!interestedIn) {
    return NextResponse.json(
      { error: "no_interest", message: "Pick at least one mode" },
      { status: 400 }
    );
  }

  const loops = await createComingSoonLoopsContact(email, interestedIn);

  try {
    await recordComingSoonCapture({
      email,
      deviceId: body.deviceId?.trim() || undefined,
      interestedIn,
    });
  } catch (err) {
    console.error("[coming-soon] db write failed:", err);
  }

  if (!loops.ok && !loops.skipped) {
    return NextResponse.json(
      {
        error: "api_fail",
        message: "Something went wrong — try again shortly",
      },
      { status: 502 }
    );
  }

  const count = await getComingSoonWaitlistCount();

  return NextResponse.json({
    ok: true,
    loops: loops.ok || loops.skipped,
    count,
    interestedIn,
    source: "coming_soon_banner",
    captured_at: new Date().toISOString(),
  });
}
