"use client";

import { SOUND_LEGEND, playCoachingSound } from "@/lib/shadow/liveCoachingSounds";

interface SoundLegendModalProps {
  open: boolean;
  onClose: () => void;
}

export function SoundLegendModal({ open, onClose }: SoundLegendModalProps) {
  if (!open) return null;

  return (
    <div className="sound-legend-overlay" role="dialog" aria-modal="true">
      <div className="sound-legend-sheet">
        <div className="sound-legend-header">
          <h2 className="sound-legend-title">What the sounds mean</h2>
          <button type="button" className="sound-legend-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="sound-legend-subtitle">
          No text on screen during the round — just these sounds, live. Tap any one to hear it now.
        </p>
        <div className="sound-legend-list">
          {SOUND_LEGEND.map((item) => (
            <button
              key={item.category}
              type="button"
              className="sound-legend-item"
              onClick={() => playCoachingSound(item.category)}
            >
              <span className="sound-legend-item-icon" aria-hidden>
                ▶
              </span>
              <span className="sound-legend-item-text">
                <span className="sound-legend-item-label">{item.label}</span>
                <span className="sound-legend-item-desc">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="ff-primary-btn sound-legend-done" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
