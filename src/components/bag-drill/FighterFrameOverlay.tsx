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
      ? "h-[62%] w-[92%] max-w-md"
      : size === "compact"
        ? "h-[42%] w-[68%]"
        : "h-[52%] w-[82%] max-w-sm";

  const labelClass =
    size === "large"
      ? "text-[11px] tracking-[0.2em]"
      : "text-[10px] tracking-[0.18em]";

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] bottom-36 z-[5] flex items-center justify-center ${
        mirrored ? "scale-x-[-1]" : ""
      }`}
    >
      <div
        className={`relative border-[2.5px] border-dashed border-white/50 ${frameClass} rounded-2xl pb-3 pt-8 shadow-[inset_0_0_48px_rgba(255,255,255,0.05)]`}
      >
        <div
          className={`absolute left-0 right-0 top-3 text-center font-medium uppercase text-white/60 ${labelClass}`}
        >
          Shoulders &amp; hands in frame
        </div>
        <div className="absolute left-1/2 top-[18%] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white/35" />
        <div className="absolute bottom-[22%] left-[16%] h-5 w-5 rounded-full border-2 border-white/30" />
        <div className="absolute bottom-[22%] right-[16%] h-5 w-5 rounded-full border-2 border-white/30" />
      </div>
    </div>
  );
}
