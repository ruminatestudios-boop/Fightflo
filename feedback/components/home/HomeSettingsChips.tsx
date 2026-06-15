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
  return (
    <div className="home-settings-chips">
      <button type="button" className="home-settings-chip" onClick={onNameClick}>
        {userName ?? "Add your name"}
      </button>
      <span className="home-settings-dot" aria-hidden>
        ·
      </span>
      <button type="button" className="home-settings-chip" onClick={onSportClick}>
        {SPORTS[sport].emoji} {SPORTS[sport].name}
      </button>
      <span className="home-settings-dot" aria-hidden>
        ·
      </span>
      <button type="button" className="home-settings-chip" onClick={onLevelClick}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </button>
      <span className="home-settings-dot" aria-hidden>
        ·
      </span>
      <span className="home-settings-hint">tap to change</span>
    </div>
  );
}
