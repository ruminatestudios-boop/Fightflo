"use client";

import { useMemo } from "react";
import { computeVideoContentRect } from "@/components/video/videoLayout";
import type { PersonCandidate } from "@/lib/pose/asyncPoseEngine";

interface PersonLockOverlayProps {
  candidates: PersonCandidate[];
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
  mirror?: boolean;
  onSelect: (candidate: PersonCandidate) => void;
}

function boundingBox(candidate: PersonCandidate) {
  const visible = candidate.pose.filter((p) => (p.visibility ?? 1) > 0.3);
  if (visible.length === 0) return null;
  const xs = visible.map((p) => p.x);
  const ys = visible.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export function PersonLockOverlay({
  candidates,
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight,
  mirror = false,
  onSelect,
}: PersonLockOverlayProps) {
  const rect = useMemo(
    () =>
      computeVideoContentRect(videoWidth, videoHeight, containerWidth, containerHeight, "cover", mirror),
    [videoWidth, videoHeight, containerWidth, containerHeight, mirror]
  );

  if (candidates.length < 2) return null;

  return (
    <div className="person-lock-overlay" aria-hidden={false}>
      {candidates.map((candidate, i) => {
        const box = boundingBox(candidate);
        if (!box) return null;

        const px = mirror ? 1 - box.maxX : box.minX;
        const left = rect.offsetX + px * rect.drawWidth;
        const top = rect.offsetY + box.minY * rect.drawHeight;
        const width = (box.maxX - box.minX) * rect.drawWidth;
        const height = (box.maxY - box.minY) * rect.drawHeight;

        return (
          <button
            key={i}
            type="button"
            className={`person-lock-box ${candidate.isAutoPick ? "person-lock-box--auto" : ""}`}
            style={{ left, top, width, height }}
            onClick={() => onSelect(candidate)}
          >
            {candidate.isAutoPick ? (
              <span className="person-lock-box-label">Tracking this fighter</span>
            ) : (
              <span className="person-lock-box-label person-lock-box-label--alt">Tap to track</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
