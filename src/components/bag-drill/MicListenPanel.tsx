"use client";

import { useEffect, useState } from "react";
import {
  createMicLevelMonitor,
  hasLiveMicrophone,
  iosMicSettingsSteps,
} from "@/lib/bag-drill/media-capture";

interface MicListenPanelProps {
  stream: MediaStream | null;
  /** Required test hits before showing success (0 = no requirement). */
  hitsRequired?: number;
  hitsDetected?: number;
  peakThreshold?: number;
  onPeak?: () => void;
  onEnableMic?: () => void;
  enabling?: boolean;
  /** Hide retry button when Safari has mic permanently denied. */
  micPermissionDenied?: boolean;
  /** Compact bar for in-session overlay. */
  variant?: "setup" | "live";
}

function micBlockedHint(): string {
  if (typeof navigator === "undefined") return "";
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? iosMicSettingsSteps().join(" · ")
    : "Allow mic when prompted, or check site permissions in browser settings";
}

export function MicListenPanel({
  stream,
  hitsRequired = 0,
  hitsDetected = 0,
  peakThreshold = 0.18,
  onPeak,
  onEnableMic,
  enabling = false,
  micPermissionDenied = false,
  variant = "setup",
}: MicListenPanelProps) {
  const micLive = hasLiveMicrophone(stream);
  const [level, setLevel] = useState(0);
  const [flash, setFlash] = useState(false);
  const [peaksSeen, setPeaksSeen] = useState(0);

  useEffect(() => {
    if (!stream || !micLive) {
      setLevel(0);
      return;
    }

    const monitor = createMicLevelMonitor(stream, {
      peakThreshold,
      onPeak: () => {
        setFlash(true);
        setPeaksSeen((n) => n + 1);
        onPeak?.();
        window.setTimeout(() => setFlash(false), 450);
      },
    });
    if (!monitor) return;

    const id = window.setInterval(() => setLevel(monitor.getLevel()), 48);
    return () => {
      window.clearInterval(id);
      monitor.stop();
    };
  }, [stream, micLive, peakThreshold, onPeak]);

  const hitsOk = hitsRequired <= 0 || hitsDetected >= hitsRequired;
  const levelPct = Math.min(100, Math.round(level * 100));
  const active = levelPct > 8 || flash;

  if (variant === "live") {
    return (
      <div
        className={`rounded-xl border px-4 py-3 transition-colors ${
          flash
            ? "border-emerald-400/50 bg-emerald-500/15"
            : micLive
              ? "border-white/10 bg-white/[0.04]"
              : "border-amber-500/30 bg-amber-500/10"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p
            className={`text-[10px] font-medium uppercase tracking-[0.16em] ${
              flash ? "text-emerald-300" : micLive ? "text-white/50" : "text-amber-200/90"
            }`}
          >
            {flash ? "Hit detected" : micLive ? "Mic listening" : "Mic blocked — tap to count"}
          </p>
          {micLive && (
            <span className="text-[10px] tabular-nums text-white/35">{levelPct}%</span>
          )}
        </div>
        {micLive && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                flash ? "bg-emerald-400" : active ? "bg-[#fa4141]" : "bg-white/25"
              }`}
              style={{ width: `${Math.max(levelPct, active ? 12 : 4)}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
          Mic check
        </p>
        {!micPermissionDenied && (
          <p className="mt-1 text-sm leading-relaxed text-white/70">
            Prop phone on a ledge or bag stand —{" "}
            <span className="text-white">mic hole toward the bag</span>. Throw one test punch
            and watch the bar spike.
          </p>
        )}
      </div>

          {!micLive ? (
        <div className="space-y-2">
          <p className="text-sm text-[#fa4141]/90">
            {micPermissionDenied
              ? "Microphone blocked in Safari — change Website Settings:"
              : "Microphone blocked — punch timing won't work until Safari allows it."}
          </p>
          {micPermissionDenied ? (
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-white/55">
              {iosMicSettingsSteps().map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="text-xs leading-relaxed text-white/45">{micBlockedHint()}</p>
          )}
          {onEnableMic && !micPermissionDenied && (
            <button
              type="button"
              onClick={onEnableMic}
              disabled={enabling}
              className="font-display flex h-11 w-full items-center justify-center rounded-full bg-[#fa4141] text-[11px] tracking-[0.14em] text-white disabled:opacity-60"
            >
              {enabling ? "Opening mic…" : "Enable microphone"}
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className={`rounded-xl border px-3 py-3 transition-colors ${
              flash ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-black/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-xs font-medium uppercase tracking-[0.14em] ${
                  flash ? "text-emerald-300" : active ? "text-[#fa4141]" : "text-white/40"
                }`}
              >
                {flash ? "Punch heard ✓" : active ? "Hearing bag noise…" : "Listening…"}
              </p>
              <span className="text-xs tabular-nums text-white/35">{levelPct}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  flash ? "bg-emerald-400" : levelPct > 25 ? "bg-[#fa4141]" : "bg-white/30"
                }`}
                style={{ width: `${Math.max(levelPct, 6)}%` }}
              />
            </div>
          </div>

          {hitsRequired > 0 && (
            <p
              className={`text-center text-sm ${
                hitsOk ? "text-emerald-400/90" : "text-white/55"
              }`}
            >
              Test punches: {hitsDetected}/{hitsRequired}
              {hitsOk ? " — ready" : " — hit the bag once"}
            </p>
          )}

          {peaksSeen > 0 && !hitsOk && hitsRequired <= 0 && (
            <p className="text-center text-sm text-emerald-400/90">
              Mic is picking up impacts — you&apos;re good to go
            </p>
          )}
        </>
      )}
    </div>
  );
}
