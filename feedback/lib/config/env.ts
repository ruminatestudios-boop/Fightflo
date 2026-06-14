export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** True when running without production backends — uses in-memory DB + demo analysis */
export function isLocalDevMode(): boolean {
  return !isSupabaseConfigured();
}

/** Skip free/pro analysis caps — local testing only */
export function isAnalysisLimitBypassed(): boolean {
  return process.env.ANALYSIS_LIMIT_BYPASS === "true";
}
