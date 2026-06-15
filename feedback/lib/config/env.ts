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

/** Real video analysis (frames + pose + Gemini) — not the sleep-and-hallucinate demo path */
export function isRealAnalysisPipelineEnabled(): boolean {
  return isGeminiConfigured();
}

/** Client-safe flag (GEMINI_API_KEY is server-only) */
export function isPublicRealAnalysisEnabled(): boolean {
  return process.env.NEXT_PUBLIC_REAL_ANALYSIS === "true";
}

/** Skip free/pro analysis caps — local testing only */
export function isAnalysisLimitBypassed(): boolean {
  return process.env.ANALYSIS_LIMIT_BYPASS === "true";
}

/** Unlock Pro features (download, clips) — on by default in local dev */
export function isProFeaturesBypassed(): boolean {
  if (process.env.PRO_FEATURES_BYPASS === "true") return true;
  if (process.env.PRO_FEATURES_BYPASS === "false") return false;
  if (process.env.NODE_ENV === "development") return true;
  return isLocalDevMode();
}

export function hasProAccess(user: { is_pro: boolean } | null | undefined): boolean {
  if (isProFeaturesBypassed()) return true;
  return user?.is_pro ?? false;
}

export function isLoopsConfigured(): boolean {
  return Boolean(process.env.LOOPS_API_KEY?.trim());
}
