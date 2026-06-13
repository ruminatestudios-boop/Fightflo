"use client";

import type { ReactNode } from "react";

export type BagTab = "train" | "progress";

interface BagTabBarProps {
  active: BagTab;
  onTrain: () => void;
  onProgress: () => void;
}

const TABS: {
  id: BagTab;
  label: string;
  icon: (active: boolean) => ReactNode;
}[] = [
  {
    id: "train",
    label: "Train",
    icon: (active) => (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.25 : 1.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
  },
  {
    id: "progress",
    label: "Progress",
    icon: (active) => (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.25 : 1.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
];

export function BagTabBar({ active, onTrain, onProgress }: BagTabBarProps) {
  const handlers: Record<BagTab, () => void> = {
    train: onTrain,
    progress: onProgress,
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-black/95 backdrop-blur-xl"
      aria-label="Bag drill navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={handlers[tab.id]}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-[5.5rem] flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                isActive ? "text-[#fa4141]" : "text-[#737373] hover:text-[#a3a3a3]"
              }`}
            >
              {tab.icon(isActive)}
              <span className="text-[10px] font-medium uppercase tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Bottom padding when hub tab bar is visible */
export const BAG_TAB_BAR_PAD =
  "pb-[calc(4.25rem+max(0.5rem,env(safe-area-inset-bottom)))]";
