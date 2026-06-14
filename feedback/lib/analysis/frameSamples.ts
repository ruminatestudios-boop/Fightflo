import { readFile } from "fs/promises";

/** Evenly sample JPEG frames for Gemini vision (coaching grounded in footage). */
export async function loadFrameSamples(
  framePaths: string[],
  maxSamples = 10
): Promise<string[]> {
  if (framePaths.length === 0) return [];

  const count = Math.min(maxSamples, framePaths.length);
  const indices: number[] = [];

  for (let i = 0; i < count; i++) {
    const idx =
      count === 1
        ? 0
        : Math.round((i / (count - 1)) * (framePaths.length - 1));
    if (!indices.includes(idx)) indices.push(idx);
  }

  const images: string[] = [];
  for (const i of indices) {
    const buffer = await readFile(framePaths[i]);
    images.push(buffer.toString("base64"));
  }

  return images;
}
