"use client";

interface FighterFrameOverlayProps {
  /** Mirror for front-camera preview */
  mirrored?: boolean;
  compact?: boolean;
}

/** Guides shoulders + hands into frame for fighter-cam AI. */
export function FighterFrameOverlay({
  mirrored = false,
  compact = false,
}: FighterFrameOverlayProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${
        mirrored ? "scale-x-[-1]" : ""
      }`}
    >
      <div
        className={`relative border-2 border-dashed border-white/45 ${
          compact ? "h-[50%] w-[70%]" : "h-[58%] w-[78%] max-w-sm"
        } rounded-2xl shadow-[inset_0_0_40px_rgba(255,255,255,0.04)]`}
      >
        <div className="absolute -top-7 left-0 right-0 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
          Shoulders &amp; hands in frame
        </div>
        <div className="absolute left-1/2 top-[18%] h-3 w-3 -translate-x-1/2 rounded-full border border-white/30" />
        <div className="absolute bottom-[22%] left-[18%] h-4 w-4 rounded-full border border-white/25" />
        <div className="absolute bottom-[22%] right-[18%] h-4 w-4 rounded-full border border-white/25" />
      </div>
    </div>
  );
}
