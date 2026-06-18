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

/** Validate a crew access token passed from the client */
export function isValidCrewToken(token?: string | null): boolean {
  const secret = process.env.CREW_ACCESS_TOKEN?.trim();
  if (!secret || !token) return false;
  return token.trim() === secret;
}

/** Unlock Pro features (download, clips) — on by default in local dev */
export function isProFeaturesBypassed(): boolean {
  if (process.env.PRO_FEATURES_BYPASS === "true") return true;
  if (process.env.PRO_FEATURES_BYPASS === "false") return false;
  if (isAnalysisLimitBypassed()) return true;
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

/** Per-scan cost logging to Google Sheets (optional) */
export function isGoogleSheetsWebhookConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() &&
      process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim()
  );
}

function isGoogleSheetsServiceAccountConfigured(): boolean {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) return true;

  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() &&
      process.env.GOOGLE_SHEETS_ID?.trim()
  );
}

export function isGoogleSheetsConfigured(): boolean {
  return (
    isGoogleSheetsWebhookConfigured() || isGoogleSheetsServiceAccountConfigured()
  );
}
