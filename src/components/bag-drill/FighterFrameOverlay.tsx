"use client";

interface FighterFrameOverlayProps {
  /** Mirror for front-camera preview */
  mirrored?: boolean;
  /** large = setup/calibration, compact = training HUD */
  size?: "large" | "default" | "compact";
}

/** Guides shoulders + hands into frame for fighter-cam AI. */
export function FighterFrameOverlay({
  mirrored = false,
  size = "default",
}: FighterFrameOverlayProps) {
  const frameClass =
    size === "large"
      ? "min-h-[72vh] w-[92%] max-w-md"
      : size === "compact"
        ? "min-h-[42vh] w-[68%]"
        : "min-h-[56vh] w-[82%] max-w-sm";

  const labelClass =
    size === "large"
      ? "text-[11px] tracking-[0.2em]"
      : "text-[10px] tracking-[0.18em]";

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-[max(4rem,env(safe-area-inset-top))] bottom-24 z-[5] flex items-stretch justify-center px-3 ${
        mirrored ? "scale-x-[-1]" : ""
      }`}
    >
      <div
        className={`relative flex-1 border-[2.5px] border-dashed border-white/50 ${frameClass} rounded-2xl shadow-[inset_0_0_48px_rgba(255,255,255,0.05)]`}
      >
        <div
          className={`absolute left-0 right-0 top-3 text-center font-medium uppercase text-white/60 ${labelClass}`}
        >
          Shoulders &amp; hands in frame
        </div>
      </div>
    </div>
  );
}
