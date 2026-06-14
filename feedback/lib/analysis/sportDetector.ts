import { readFile } from "fs/promises";
import { callGeminiVision } from "@/lib/ai/gemini";
import { AVAILABLE_SPORTS } from "@/config/sports";
import type { SportId } from "@/types";

interface SportDetectionResult {
  sport: SportId;
  confidence: number;
  techniques_seen: string[];
}

const DETECTION_PROMPT = `You classify sports training footage from still frames.

Return JSON only:
{
  "sport": "<sport_id>",
  "confidence": 0.0-1.0,
  "techniques_seen": ["brief labels of what you see, e.g. roundhouse kick, jab, golf swing"]
}

Valid sport_id values (use exactly these strings):
${AVAILABLE_SPORTS.join(", ")}

Rules:
- Kicks (roundhouse, teep, knee) → muaythai unless clearly MMA cage/grappling
- Punches only in boxing stance/gloves → boxing
- Golf club and swing → golf
- Racket and court → tennis
- If unsure between boxing and muaythai, prefer what techniques dominate the clip`;

export async function detectSportFromFrames(
  framePaths: string[],
  selectedSport: SportId
): Promise<SportDetectionResult> {
  if (framePaths.length === 0) {
    return { sport: selectedSport, confidence: 0, techniques_seen: [] };
  }

  const sampleIndices = [0, Math.floor(framePaths.length / 3), Math.floor((2 * framePaths.length) / 3)]
    .filter((i, idx, arr) => arr.indexOf(i) === idx);

  const images: string[] = [];
  for (const i of sampleIndices) {
    const path = framePaths[Math.min(i, framePaths.length - 1)];
    const buffer = await readFile(path);
    images.push(buffer.toString("base64"));
  }

  try {
    const result = await callGeminiVision<SportDetectionResult>(
      DETECTION_PROMPT,
      images,
      { selected_sport: selectedSport, available_sports: AVAILABLE_SPORTS }
    );

    if (!AVAILABLE_SPORTS.includes(result.sport)) {
      return { sport: selectedSport, confidence: 0, techniques_seen: result.techniques_seen ?? [] };
    }

    return result;
  } catch {
    return { sport: selectedSport, confidence: 0, techniques_seen: [] };
  }
}
