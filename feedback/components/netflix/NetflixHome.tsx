"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NetflixShell } from "@/components/netflix/NetflixShell";
import { AnalysisProgressView } from "@/components/shared/AnalysisProgressView";
import { DevModeBanner } from "@/components/shared/DevModeBanner";
import { LevelSelector } from "@/components/shared/LevelSelector";
import { SportSelector } from "@/components/shared/SportSelector";
import { UploadZone, type UploadZoneHandle } from "@/components/upload/UploadZone";
import { useUpload } from "@/hooks/useUpload";
import { useUploadStatusTicker } from "@/hooks/useUploadStatusTicker";
import { getSportConfig } from "@/config/sports";
import type { SkillLevel, SportId } from "@/types";

export function NetflixHome() {
  const router = useRouter();
  const uploadRef = useRef<UploadZoneHandle>(null);
  const [sport, setSport] = useState<SportId>("boxing");
  const [level, setLevel] = useState<SkillLevel>("intermediate");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { phase, progress, message, error, upload } = useUpload();
  const sportConfig = getSportConfig(sport);
  const isBusy = phase === "uploading" || phase === "processing";
  const uploadStatus = useUploadStatusTicker(isBusy, message, progress);

  const handleFile = useCallback(
    async (file: File) => {
      const sessionId = await upload(file, sport, level);
      if (sessionId) router.push(`/report/${sessionId}`);
    },
    [upload, sport, level, router]
  );

  return (
    <NetflixShell>
      <div className="netflix-slide-inner netflix-gradient-hero h-full">
        <div className="netflix-slide-content justify-end pb-36">
          <DevModeBanner />
          <p className="netflix-eyebrow mt-4">AI fight analysis</p>
          <h1 className="netflix-display mt-4 max-w-[14rem]">
            {sportConfig.name}
          </h1>
          <p className="netflix-body mt-5 max-w-[16rem] text-white/55">
            Upload your session. Get timestamped coaching on exactly what to fix.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="netflix-tag">{sportConfig.emoji} {sportConfig.name}</span>
            <span className="netflix-tag capitalize">{level}</span>
          </div>

          {isBusy ? (
            <div className="mt-10 w-full max-w-sm">
              <AnalysisProgressView
                eyebrow={uploadStatus.eyebrow}
                headline={uploadStatus.headline}
                message={uploadStatus.message}
                progress={progress}
                footer="Preparing your analysis…"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="netflix-cta-primary mt-10"
            >
              Upload session
            </button>
          )}
          {error && (
            <p className="mt-4 text-sm text-[#e50914]">{error}</p>
          )}
          <p className="mt-6 text-xs text-white/30">
            1 free analysis · Pro £9.99/mo
          </p>
        </div>
      </div>

      {sheetOpen && !isBusy && (
        <div className="netflix-modal-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="netflix-modal-backdrop"
            onClick={() => setSheetOpen(false)}
            aria-label="Close"
          />
          <div className="netflix-modal-sheet border-t-2 border-white/10">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25" />
            <h2 className="netflix-title text-lg">New analysis</h2>

            <div className="mt-4 space-y-3">
              <section>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">
                  Sport
                </p>
                <SportSelector value={sport} onChange={setSport} />
              </section>
              <section>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">
                  Level
                </p>
                <LevelSelector value={level} onChange={setLevel} />
              </section>
              <UploadZone
                ref={uploadRef}
                hidden
                onFileSelect={(file) => {
                  setSheetOpen(false);
                  handleFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => uploadRef.current?.open()}
                className="netflix-cta-primary w-full py-3 text-sm"
              >
                Choose video
              </button>
              <p className="text-center text-[10px] text-white/30">
                MP4, MOV, AVI · Max 500MB
              </p>
            </div>
          </div>
        </div>
      )}
    </NetflixShell>
  );
}
