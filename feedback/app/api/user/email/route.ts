import { NextRequest, NextResponse } from "next/server";
import { saveUserEmail } from "@/lib/email/notifications";
import type { SportId } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      email?: string;
      sport?: SportId;
    };

    if (!body.userId || !body.email) {
      return NextResponse.json(
        { error: "userId and email required" },
        { status: 400 }
      );
    }

    const result = await saveUserEmail({
      userId: body.userId,
      email: body.email,
      sport: body.sport,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Could not save email" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[user/email]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 }
    );
  }
}
