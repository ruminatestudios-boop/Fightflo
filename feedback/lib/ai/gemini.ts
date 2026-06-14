import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export async function callGemini<T>(
  systemPrompt: string,
  userPayload: unknown,
  options?: { model?: string; temperature?: number }
): Promise<T> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: options?.model ?? DEFAULT_MODEL,
    generationConfig: {
      temperature: options?.temperature ?? 0.4,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: JSON.stringify(userPayload, null, 2) },
  ]);

  const text = result.response.text();
  return JSON.parse(text) as T;
}

export async function callGeminiVision<T>(
  systemPrompt: string,
  frameBase64Images: string[],
  userPayload: unknown
): Promise<T> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  const imageParts = frameBase64Images.slice(0, 16).map((data) => ({
    inlineData: { mimeType: "image/jpeg", data },
  }));

  const result = await model.generateContent([
    { text: systemPrompt },
    ...imageParts,
    { text: JSON.stringify(userPayload, null, 2) },
  ]);

  const text = result.response.text();
  return JSON.parse(text) as T;
}
