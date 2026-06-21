"use client";

import type { ReactNode } from "react";

export interface HomePickerOption {
  id: string;
  label: string;
  hint: string;
  icon: ReactNode;
}

interface HomePickerGridProps {
  options: HomePickerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <span className="glass-card-icon" aria-hidden>
      {children}
    </span>
  );
}

export function HomePickerGrid({
  options,
  selectedId,
  onSelect,
  className = "",
}: HomePickerGridProps) {
  return (
    <div className={`home-picker-list ${className}`.trim()}>
      {options.map((option) => {
        const selected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`home-picker-row ${selected ? "home-picker-row--selected" : ""}`}
            onClick={() => onSelect(option.id)}
            aria-pressed={selected}
          >
            <span className="home-picker-row-icon" aria-hidden>{option.icon}</span>
            <span className="home-picker-row-text">
              <span className="home-picker-row-label">{option.label}</span>
              {option.hint ? (
                <span className="home-picker-row-hint">{option.hint}</span>
              ) : null}
            </span>
            {selected && (
              <span className="home-picker-row-check" aria-hidden>✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
