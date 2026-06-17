/** USD pricing defaults — override via env for your plan/rates. */

const GEMINI_INPUT_PER_M =
  Number(process.env.COST_GEMINI_INPUT_PER_M_TOKENS) || 0.3;
const GEMINI_OUTPUT_PER_M =
  Number(process.env.COST_GEMINI_OUTPUT_PER_M_TOKENS) || 2.5;
/** Amortised upload + storage per GB per scan */
const CLOUDINARY_PER_GB =
  Number(process.env.COST_CLOUDINARY_PER_GB) || 0.05;
/** Vercel serverless beyond included quota */
const COMPUTE_PER_GB_HOUR =
  Number(process.env.COST_VERCEL_PER_GB_HOUR) || 0.18;
const FUNCTION_MEMORY_GB =
  Number(process.env.VERCEL_FUNCTION_MEMORY_GB) || 1;

export function geminiCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * GEMINI_INPUT_PER_M +
    (outputTokens / 1_000_000) * GEMINI_OUTPUT_PER_M
  );
}

export function cloudinaryCostUsd(totalBytes: number): number {
  return (totalBytes / 1_000_000_000) * CLOUDINARY_PER_GB;
}

export function computeCostUsd(durationMs: number): number {
  const gbHours = (durationMs / 3_600_000) * FUNCTION_MEMORY_GB;
  return gbHours * COMPUTE_PER_GB_HOUR;
}
