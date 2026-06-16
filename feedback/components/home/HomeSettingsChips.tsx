"use client";

import { SPORTS } from "@/config/sports";
import type { SkillLevel, SportId } from "@/types";

interface HomeSettingsChipsProps {
  sport: SportId;
  level: SkillLevel;
  userName: string | null;
  onSportClick: () => void;
  onLevelClick: () => void;
  onNameClick: () => void;
}

export function HomeSettingsChips({
  sport,
  level,
  userName,
  onSportClick,
  onLevelClick,
  onNameClick,
}: HomeSettingsChipsProps) {
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <div className="home-settings-chips">
      <button
        type="button"
        className="home-settings-chip-pill"
        onClick={onNameClick}
        title={userName ?? "Add your name"}
      >
        <span className="home-settings-chip-pill-kicker">Name</span>
        <span className="home-settings-chip-pill-value">{userName ?? "Add"}</span>
      </button>

      <button
        type="button"
        className="home-settings-chip-pill"
        onClick={onSportClick}
        title={`${SPORTS[sport].name} — change sport`}
      >
        <span className="home-settings-chip-pill-kicker">Sport</span>
        <span className="home-settings-chip-pill-value">
          {SPORTS[sport].emoji} {SPORTS[sport].name}
        </span>
      </button>

      <button
        type="button"
        className="home-settings-chip-pill"
        onClick={onLevelClick}
        title={`${levelLabel} — change level`}
      >
        <span className="home-settings-chip-pill-kicker">Level</span>
        <span className="home-settings-chip-pill-value">{levelLabel}</span>
      </button>
    </div>
  );
}
