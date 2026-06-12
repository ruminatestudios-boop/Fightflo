import { NextResponse } from "next/server";
import { generateGeminiOpponentPlan } from "@/lib/gemini-opponent";
import { buildOpponentSession } from "@/lib/opponent-planner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim();
    if (!query || query.length > 120) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const geminiPlan = await generateGeminiOpponentPlan(query);
    const plan = geminiPlan ?? buildOpponentSession(query);

    return NextResponse.json(plan);
  } catch {
    return NextResponse.json(
      { error: "Plan generation failed" },
      { status: 500 }
    );
  }
}
