import { GoogleGenAI, Modality } from "@google/genai/node";
import { NextResponse } from "next/server";
import {
  buildBagDetectionPrompt,
  buildFighterValidationPrompt,
} from "@/lib/bag-drill/strike-validator";
import { getUser } from "@/lib/db/users";

export const runtime = "nodejs";

const LIVE_MODEL = "gemini-2.0-flash-live-001";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let cameraMode: "bag" | "fighter" = "bag";
  let deviceId: string | undefined;
  let stance: "orthodox" | "southpaw" = "orthodox";
  try {
    const body = (await request.json()) as {
      cameraMode?: string;
      deviceId?: string;
      stance?: string;
    };
    if (body.cameraMode === "fighter") cameraMode = "fighter";
    if (body.stance === "southpaw") stance = "southpaw";
    deviceId = body.deviceId?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const user = await getUser(deviceId);
  if (!user?.isPro) {
    return NextResponse.json(
      { error: "Pro subscription required for AI punch recognition" },
      { status: 403 }
    );
  }

  const prompt =
    cameraMode === "fighter"
      ? buildFighterValidationPrompt(stance)
      : buildBagDetectionPrompt();

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const expire = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: expire,
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.TEXT],
            systemInstruction: { parts: [{ text: prompt }] },
          },
        },
      },
    });

    const name = token.name;
    if (!name) {
      return NextResponse.json(
        { error: "Failed to create ephemeral token." },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: name });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Token creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
