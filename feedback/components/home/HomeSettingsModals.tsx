"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HomePickerGrid } from "@/components/home/HomePickerGrid";
import { ModalShell } from "@/components/shared/ModalShell";
import { SELECTABLE_SPORTS, SPORTS } from "@/config/sports";
import { formatDisplayName } from "@/lib/user/displayName";
import { storeUserName } from "@/lib/storage/client";
import type { SkillLevel, SportId } from "@/types";

export type HomeSettingsModal = "hub" | "name" | "sport" | "level" | null;

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
  onNavigate?: (modal: HomeSettingsModal) => void;
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
  onNavigate,
  sport,
  level,
  userName,
  nameDraft,
  onSportChange,
  onLevelChange,
  onUserNameChange,
  onNameDraftChange,
}: HomeSettingsModalsProps) {
  const router = useRouter();
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
        open={open === "hub"}
        onClose={onClose}
        compact
        subtitle="Your profile"
        title="Settings"
        titleId="home-settings-hub-title"
        bodyClassName="home-settings-modal-body"
      >
        <div className="home-settings-hub-list">
          <button
            type="button"
            className="home-settings-hub-row"
            onClick={() => onNavigate?.("sport")}
          >
            <span className="home-settings-hub-row-kicker">Sport</span>
            <span className="home-settings-hub-row-value">
              {SPORTS[sport].emoji} {SPORTS[sport].name}
            </span>
          </button>
          <button
            type="button"
            className="home-settings-hub-row"
            onClick={() => onNavigate?.("level")}
          >
            <span className="home-settings-hub-row-kicker">Level</span>
            <span className="home-settings-hub-row-value">
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </span>
          </button>

          <button
            type="button"
            className="home-settings-hub-row home-settings-hub-row--section-start"
            onClick={() => { onClose(); router.push("/developer"); }}
          >
            <span className="home-settings-hub-row-kicker">Developer API</span>
            <span className="home-settings-hub-row-value">Manage API keys →</span>
          </button>

          <button
            type="button"
            className="home-settings-hub-row home-settings-hub-row--section-start"
            onClick={() => { onClose(); router.push("/terms"); }}
          >
            <span className="home-settings-hub-row-kicker">Terms of Service</span>
            <span className="home-settings-hub-row-value" />
          </button>
          <button
            type="button"
            className="home-settings-hub-row"
            onClick={() => { onClose(); router.push("/privacy"); }}
          >
            <span className="home-settings-hub-row-kicker">Privacy Policy</span>
            <span className="home-settings-hub-row-value" />
          </button>
          <button
            type="button"
            className="home-settings-hub-row"
            onClick={() => { onClose(); window.location.href = "mailto:hello@fightflo.app?subject=Fightflo%20Feedback"; }}
          >
            <span className="home-settings-hub-row-kicker">Contact Us</span>
            <span className="home-settings-hub-row-value">hello@fightflo.app</span>
          </button>

          <p className="home-settings-hub-version">Fightflo · Video analysis for serious fighters · v1.0</p>
        </div>
      </ModalShell>

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
      </ModalShell>

      <ModalShell
        open={open === "sport"}
        onClose={onClose}
        compact
        subtitle="Sport"
        title="Select your sport"
        titleId="home-sport-modal-title"
        bodyClassName="home-settings-modal-body"
      >
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
        subtitle="Level"
        title="Select your level"
        titleId="home-level-modal-title"
        bodyClassName="home-settings-modal-body"
      >
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
