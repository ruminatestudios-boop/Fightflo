"use client";

import type { PoseQualityReport } from "@/types";

export function PoseQualityBanner({ quality }: { quality?: PoseQualityReport | null }) {
  if (!quality || quality.score >= 70) return null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-center text-xs ${
        quality.usable
          ? "border-white/10 bg-white/[0.03] text-white/55"
          : "border-[#fa4141]/30 bg-[#fa4141]/10 text-[#fa4141]/90"
      }`}
    >
      <p>{quality.message}</p>
      <p className="mt-1 font-mono text-[10px] opacity-70">
        Pose tracking {quality.score}% · {quality.frames_with_pose}/{quality.frames_total} frames
      </p>
    </div>
  );
}
