"use client";

import { isPublicRealAnalysisEnabled } from "@/lib/config/env";

export function DevModeBanner() {
  if (isPublicRealAnalysisEnabled()) return null;

  return (
    <div className="rounded-full bg-[#2a2a2a] px-4 py-2.5 text-center text-[11px] text-white/50">
      Demo mode — add <code className="text-[#ff9500]">GEMINI_API_KEY</code> to
      .env for real video analysis
    </div>
  );
}
