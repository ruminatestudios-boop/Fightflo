"use client";

import { useMemo, useState } from "react";
import type { TimelineMoment } from "./types";
import { formatTime } from "./utils";

interface TimelineMarkersProps {
  duration: number;
  currentTime: number;
  moments: TimelineMoment[];
  onSeek: (timeSeconds: number) => void;
  onScrub?: (timeSeconds: number) => void;
  /** Glass overlay style for full-screen report */
  variant?: "default" | "glass";
}

export function TimelineMarkers({
  duration,
  currentTime,
  moments,
  onSeek,
  onScrub,
  variant = "default",
}: TimelineMarkersProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const isGlass = variant === "glass";

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const sortedMoments = useMemo(
    () => [...moments].sort((a, b) => a.timeSeconds - b.timeSeconds),
    [moments]
  );

  const seekFromClientX = (clientX: number, rect: DOMRect) => {
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onScrub?.(ratio * duration);
  };

  const trackHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      setScrubbing(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      seekFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!scrubbing) return;
      seekFromClientX(e.clientX, e.currentTarget.getBoundingClientRect());
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      setScrubbing(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
  };

  if (isGlass) {
    return (
      <div className="ff-scrub">
        <div className="ff-scrub-row">
          <span className="ff-scrub-time">{formatTime(currentTime)}</span>
          <div
            className="ff-scrub-track"
            {...trackHandlers}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            aria-label="Video timeline"
          >
            <div className="ff-scrub-rail" />
            <div
              className="ff-scrub-fill"
              style={{ width: `${progress}%` }}
            />
            <div
              className="ff-scrub-head"
              style={{ left: `${progress}%` }}
            />
            {sortedMoments.map((moment) => {
              const left = duration > 0 ? (moment.timeSeconds / duration) * 100 : 0;
              const isPositive = moment.kind === "positive";
              const hovered = hoveredId === moment.id;

              return (
                <button
                  key={moment.id}
                  type="button"
                  className={`ff-scrub-mark ff-scrub-mark--${moment.kind}`}
                  style={{ left: `${left}%` }}
                  onMouseEnter={() => setHoveredId(moment.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(moment.timeSeconds);
                  }}
                  aria-label={`${moment.kind} at ${moment.timestamp}: ${moment.title}`}
                >
                  <span className={`ff-scrub-tick ${hovered ? "ff-scrub-tick--hover" : ""}`} />
                  {hovered && (
                    <span className="ff-scrub-tooltip">
                      <span className="ff-scrub-tooltip-time">{moment.timestamp}</span>
                      {moment.title}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="ff-scrub-time ff-scrub-time--end">{formatTime(duration)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="relative h-2 cursor-pointer rounded-full bg-white/10"
        {...trackHandlers}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-label="Video timeline"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/25"
          style={{ width: `${progress}%` }}
        />

        {sortedMoments.map((moment) => {
          const left = duration > 0 ? (moment.timeSeconds / duration) * 100 : 0;
          const color = moment.kind === "positive" ? "#22c55e" : "#fa4141";
          const hovered = hoveredId === moment.id;

          return (
            <button
              key={moment.id}
              type="button"
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%` }}
              onMouseEnter={() => setHoveredId(moment.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(moment.timeSeconds);
              }}
              aria-label={`${moment.kind} at ${moment.timestamp}: ${moment.title}`}
            >
              <span
                className="block h-3 w-3 rounded-full ring-2 ring-black/40 transition-transform"
                style={{
                  backgroundColor: color,
                  transform: hovered ? "scale(1.35)" : "scale(1)",
                }}
              />
              {hovered && (
                <span className="absolute bottom-full left-1/2 mb-2 w-max max-w-[10rem] -translate-x-1/2 rounded-lg border border-white/10 bg-[#141414] px-2 py-1 text-[10px] text-white shadow-lg">
                  <span className="font-mono text-white/50">{moment.timestamp}</span>
                  <br />
                  {moment.title}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] text-white/40">
        <span>{formatTime(currentTime)}</span>
        <div className="flex items-center gap-3 text-[9px] uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" />
            Good
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#fa4141]" />
            Weakness
          </span>
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
