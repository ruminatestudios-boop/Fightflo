import { NextResponse } from "next/server";

const MODEL = "gemini-2.0-flash";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { tip: "Keep your hands up.", hype: "Beast" },
      { status: 200 }
    );
  }

  let body: {
    combo?: string;
    comboName?: string;
    confidence?: number;
    avgVelocity?: string;
    guardDrops?: string[];
    stance?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const systemPrompt = `You are a corner coach. Give feedback in under 20 words. Be direct. Mention guard drop if present. End with one hype word. Return JSON only:
{
  "tip": string,
  "hype": string
}`;

  const userPayload = JSON.stringify({
    combo: body.combo ?? "",
    comboName: body.comboName ?? "",
    confidence: body.confidence ?? 0,
    avgVelocity: body.avgVelocity ?? "Sharp",
    guardDrops: body.guardDrops ?? [],
    stance: body.stance ?? "orthodox",
  });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPayload }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { tip: "Solid combo — reset your guard.", hype: "Fire" },
        { status: 200 }
      );
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { tip?: string; hype?: string };
    return NextResponse.json({
      tip: parsed.tip ?? "Keep throwing.",
      hype: parsed.hype ?? "Go",
    });
  } catch {
    return NextResponse.json(
      { tip: "Nice work — hands up next time.", hype: "Champ" },
      { status: 200 }
    );
  }
}
