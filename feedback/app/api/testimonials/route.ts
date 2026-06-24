import { NextRequest, NextResponse } from "next/server";
import { createTestimonial } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      body?: string;
      rating?: number;
    };

    const text = body.body?.trim();
    if (!text || text.length < 5) {
      return NextResponse.json(
        { error: "Tell us a bit more — at least a few words." },
        { status: 400 }
      );
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Please add your name" }, { status: 400 });
    }

    await createTestimonial({
      name,
      body: text,
      rating: body.rating,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
