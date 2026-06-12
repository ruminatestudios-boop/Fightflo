import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TTS_MODELS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
] as const;

const COACH_VOICE = "Charon";

function wrapPcmAsWav(pcm: Buffer, sampleRate = 24000): Buffer {
  const channels = 1;
  const bits = 16;
  const byteRate = (sampleRate * channels * bits) / 8;
  const blockAlign = (channels * bits) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function coachPrompt(text: string): string {
  const line = text.trim().slice(0, 120);
  return `Say as one consistent male fight coach — energetic, human, firm gym tempo, never robotic: ${line}`;
}

type SynthesizeResult = { ok: true; wav: Buffer } | { ok: false; quota?: boolean };

async function synthesize(apiKey: string, prompt: string): Promise<SynthesizeResult> {
  for (const model of TTS_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: COACH_VOICE },
                },
              },
            },
          }),
        }
      );

      if (res.status === 429) {
        return { ok: false, quota: true };
      }

      if (!res.ok) continue;

      const data = (await res.json()) as {
        candidates?: {
          content?: {
            parts?: { inlineData?: { data?: string; mimeType?: string } }[];
          };
        }[];
      };

      const b64 =
        data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
          ?.inlineData?.data;
      if (!b64) continue;

      return { ok: true, wav: wrapPcmAsWav(Buffer.from(b64, "base64")) };
    } catch {
      continue;
    }
  }
  return { ok: false };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "No API key" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();
    if (!text || text.length > 140) {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const result = await synthesize(apiKey, coachPrompt(text));
    if (!result.ok) {
      if (result.quota) {
        return NextResponse.json({ error: "Quota exceeded" }, { status: 429 });
      }
      return NextResponse.json({ error: "TTS failed" }, { status: 502 });
    }

    return new NextResponse(new Uint8Array(result.wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "TTS error" }, { status: 500 });
  }
}
