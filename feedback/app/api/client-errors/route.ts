import { NextRequest, NextResponse } from "next/server";
import { recordClientError } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: string;
      stack?: string;
      context?: string;
      url?: string;
      userId?: string;
    };

    if (!body.message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    await recordClientError({
      message: body.message,
      stack: body.stack,
      context: body.context,
      url: body.url,
      userAgent: request.headers.get("user-agent"),
      userId: body.userId,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never let error logging itself break the app
    return NextResponse.json({ ok: true });
  }
}
