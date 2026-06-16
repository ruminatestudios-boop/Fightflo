"use client";

import { useEffect, useRef } from "react";
import { HomePickerGrid } from "@/components/home/HomePickerGrid";
import { ModalShell } from "@/components/shared/ModalShell";
import { SELECTABLE_SPORTS, SPORTS } from "@/config/sports";
import { formatDisplayName } from "@/lib/user/displayName";
import { storeUserName } from "@/lib/storage/client";
import type { SkillLevel, SportId } from "@/types";

export type HomeSettingsModal = "name" | "sport" | "level" | null;

const LEVELS: { id: SkillLevel; label: string; hint: string }[] = [
  {
    id: "beginner",
    label: "Beginner",
    hint: "Learning the basics — plain language cues and fundamentals first.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    hint: "Building consistency — common faults and repeatable fixes.",
  },
  {
    id: "advanced",
    label: "Advanced",
    hint: "Refining mechanics — finer detail in timestamps and drills.",
  },
  {
    id: "pro",
    label: "Pro",
    hint: "Competition-ready reps — high standards and fight-prep focus.",
  },
];

const SPORT_OPTIONS = SELECTABLE_SPORTS.map((id) => {
  const cfg = SPORTS[id];
  const hint =
    id === "boxing"
      ? "Punches, guard & footwork — faults, timestamps and drills tuned for bag and pad work."
      : "Kicks, knees, elbows & clinch — Thai-specific cues, stance checks and drill picks.";
  return {
    id,
    label: cfg.name,
    hint,
    icon: <span className="text-base leading-none">{cfg.emoji}</span>,
  };
});

const LEVEL_OPTIONS = LEVELS.map((lvl) => ({
  id: lvl.id,
  label: lvl.label,
  hint: lvl.hint,
  icon: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
}));

interface HomeSettingsModalsProps {
  open: HomeSettingsModal;
  onClose: () => void;
  sport: SportId;
  level: SkillLevel;
  userName: string | null;
  nameDraft: string;
  onSportChange: (sport: SportId) => void;
  onLevelChange: (level: SkillLevel) => void;
  onUserNameChange: (name: string | null) => void;
  onNameDraftChange: (draft: string) => void;
}

export function HomeSettingsModals({
  open,
  onClose,
  sport,
  level,
  userName,
  nameDraft,
  onSportChange,
  onLevelChange,
  onUserNameChange,
  onNameDraftChange,
}: HomeSettingsModalsProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open !== "name") return;
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const saveName = () => {
    const formatted = formatDisplayName(nameDraft);
    if (formatted) {
      storeUserName(formatted);
      onUserNameChange(formatted);
    } else {
      storeUserName(null);
      onUserNameChange(null);
    }
    onClose();
  };

  const clearName = () => {
    storeUserName(null);
    onUserNameChange(null);
    onNameDraftChange("");
    onClose();
  };

  return (
    <>
      <ModalShell
        open={open === "name"}
        onClose={onClose}
        compact
        subtitle="Your greeting"
        title="What should we call you?"
        titleId="home-name-modal-title"
        bodyClassName="home-settings-modal-body"
        footer={
          <div className="home-settings-modal-actions">
            <button
              type="button"
              className="home-flow-action home-flow-action--primary"
              onClick={saveName}
            >
              Save
            </button>
            {userName ? (
              <button
                type="button"
                className="home-flow-action home-flow-action--secondary"
                onClick={clearName}
              >
                Clear name
              </button>
            ) : null}
          </div>
        }
      >
        <label className="home-name-field home-name-field--modal">
          First name
          <input
            ref={nameInputRef}
            className="home-name-input"
            value={nameDraft}
            onChange={(e) => onNameDraftChange(e.target.value)}
            maxLength={24}
            placeholder="e.g. Alex"
            autoComplete="given-name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveName();
              }
            }}
          />
        </label>
        <p className="home-settings-modal-hint">
          Your name appears on the home greeting.
        </p>
      </ModalShell>

      <ModalShell
        open={open === "sport"}
        onClose={onClose}
        compact
        subtitle="Your training"
        title="What are you training?"
        titleId="home-sport-modal-title"
        bodyClassName="home-settings-modal-body"
        footer={
          <p className="home-settings-modal-hint home-settings-modal-hint--footer">
            Tap your sport to save — applies to uploads and reports on this device.
          </p>
        }
      >
        <p className="home-settings-modal-hint home-settings-modal-hint--lead">
          We tailor fault detection, drills and coaching tone to the sport you pick.
        </p>
        <HomePickerGrid
          selectedId={sport}
          onSelect={(id) => {
            onSportChange(id as SportId);
            onClose();
          }}
          options={SPORT_OPTIONS}
        />
      </ModalShell>

      <ModalShell
        open={open === "level"}
        onClose={onClose}
        compact
        subtitle="Your coaching"
        title="How experienced are you?"
        titleId="home-level-modal-title"
        bodyClassName="home-settings-modal-body"
        footer={
          <p className="home-settings-modal-hint home-settings-modal-hint--footer">
            Tap your level to save — coaching depth adjusts for new uploads.
          </p>
        }
      >
        <p className="home-settings-modal-hint home-settings-modal-hint--lead">
          Pick the level that matches where you are now — we adjust how direct the feedback is.
        </p>
        <HomePickerGrid
          selectedId={level}
          onSelect={(id) => {
            onLevelChange(id as SkillLevel);
            onClose();
          }}
          options={LEVEL_OPTIONS}
        />
      </ModalShell>
    </>
  );
}
