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
    <div className={`home-feature-grid home-feature-grid--modal ${className}`.trim()}>
      <div className="home-feature-grid-secondary">
        {options.map((option) => {
          const selected = selectedId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`glass-card ${selected ? "glass-card--active" : ""}`}
              onClick={() => onSelect(option.id)}
              aria-pressed={selected}
            >
              <IconBadge>{option.icon}</IconBadge>
              <span className="glass-card-label">{option.label}</span>
              <span className="home-feature-hint">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
