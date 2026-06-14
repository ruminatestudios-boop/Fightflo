import { NextRequest, NextResponse } from "next/server";
import { runScheduledEmails } from "@/lib/email/notifications";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await runScheduledEmails();
    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    console.error("[cron/emails]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
