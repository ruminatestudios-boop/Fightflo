"use client";

import { useEffect, useRef, useState } from "react";
import { parseGuardCalibration } from "@/lib/analysis/guardCalibration";
import type { LandmarkFrame, OverlayMeasurement } from "./types";
import { OverlayCanvas } from "./OverlayCanvas";
import { formatTime, parseTimestamp } from "./utils";

interface SlowMotionClipProps {
  /** Cloudinary URL or local path — generated server-side via FFmpeg at 0.25x */
  clipUrl?: string;
  timestamp: string;
  title: string;
  /** Total clip length in seconds (default 3) */
  clipDuration?: number;
  landmarks?: LandmarkFrame[];
  measurements?: OverlayMeasurement[];
  playbackRate?: number;
  /** Where this clip starts in the full session video (seconds) */
  landmarkTimeOffset?: number;
  confirmedEvents?: import("@/types").ConfirmedPoseEvent[];
  landmarkSummary?: Record<string, unknown> | null;
}

export function SlowMotionClip({
  clipUrl,
  timestamp,
  title,
  clipDuration = 3,
  landmarks = [],
  measurements = [],
  playbackRate = 0.25,
  landmarkTimeOffset = 0,
  confirmedEvents = [],
  landmarkSummary = null,
}: SlowMotionClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clipDuration);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate, clipUrl]);

  const guardCalibration = parseGuardCalibration(landmarkSummary);

  const annotations = [
    {
      timestamp,
      timeSeconds: parseTimestamp(timestamp),
      title,
      type: "weakness" as const,
      message: "Slow motion review",
    },
  ];

  return (
    <div className="nike-card overflow-hidden rounded-xl">
      <div className="border-b border-white/6 px-4 py-3">
        <p className="label text-[#525252]">Slow motion</p>
        <h4 className="font-display mt-1 text-sm text-white">
          {title}
          <span className="ml-2 font-mono text-xs text-[#fa4141]">
            {timestamp}
          </span>
        </h4>
      </div>

      <div className="relative aspect-video bg-black">
        {clipUrl ? (
          <>
            <video
              ref={videoRef}
              src={clipUrl}
              className="h-full w-full object-contain"
              playsInline
              crossOrigin="anonymous"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) =>
                setDuration(e.currentTarget.duration || clipDuration)
              }
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            {landmarks.length > 0 && (
              <OverlayCanvas
                videoRef={videoRef}
                landmarks={landmarks}
                annotations={annotations}
                landmarkTimeOffset={landmarkTimeOffset}
                confirmedEvents={confirmedEvents}
                useLivePose={false}
                guardCalibration={guardCalibration}
              />
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm text-white/60">
              Clip pending — server generates 3s @ 0.25x with FFmpeg overlay
            </p>
            <p className="font-mono text-xs text-white/35">{timestamp}</p>
          </div>
        )}

        <div className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] text-white/80">
          {playbackRate}x
        </div>
      </div>

      {measurements.length > 0 && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/6 p-3">
          {measurements.map((m) => (
            <div
              key={m.label}
              className="rounded-lg bg-white/[0.03] px-3 py-2"
            >
              <p className="label text-[#525252]">{m.label}</p>
              <p className="mt-0.5 font-mono text-xs text-white">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-white/6 p-3">
        <input
          type="range"
          min={0}
          max={duration || clipDuration}
          step={0.01}
          value={currentTime}
          onChange={(e) => {
            const t = Number(e.target.value);
            setCurrentTime(t);
            if (videoRef.current) videoRef.current.currentTime = t;
          }}
          className="h-1 w-full cursor-pointer accent-[#fa4141]"
          aria-label="Frame scrubber"
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              if (playing) video.pause();
              else video.play();
            }}
            disabled={!clipUrl}
            className="rounded-card bg-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-40"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <span className="font-mono text-[10px] text-white/40">
            {formatTime(currentTime)} / {formatTime(duration || clipDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}
