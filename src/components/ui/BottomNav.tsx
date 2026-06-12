"use client";

import type { ReactNode } from "react";
import type { AppScreen } from "@/lib/types";

type NavTab = "home" | "train" | "challenges" | "pro";

interface BottomNavProps {
  active: NavTab;
  onHome: () => void;
  onTrain: () => void;
  onChallenges: () => void;
  onPro: () => void;
  hidden?: boolean;
  highlightPro?: boolean;
}

const TABS: { id: NavTab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: "home",
    label: "Home",
    icon: (active): ReactNode => (
      <svg className="h-6 w-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.061l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 101.061 1.06l8.69-8.689z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        )}
      </svg>
    ),
  },
  {
    id: "train",
    label: "Train",
    icon: (active): ReactNode => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    id: "challenges",
    label: "Fight",
    icon: (active): ReactNode => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.732 6.023 6.023 0 01-2.77-.732" />
      </svg>
    ),
  },
  {
    id: "pro",
    label: "Pro",
    icon: (active): ReactNode => (
      <svg className="h-6 w-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        )}
      </svg>
    ),
  },
];

export function BottomNav({
  active,
  onHome,
  onTrain,
  onChallenges,
  onPro,
  hidden = false,
  highlightPro = false,
}: BottomNavProps) {
  if (hidden) return null;

  const handlers: Record<NavTab, () => void> = {
    home: onHome,
    train: onTrain,
    challenges: onChallenges,
    pro: onPro,
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">
      <div className="app-shell flex items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={handlers[tab.id]}
              className={`relative flex min-w-[4rem] flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                isActive ? "text-[#fa4141]" : "text-[#737373] hover:text-[#a3a3a3]"
              }`}
            >
              {tab.id === "pro" && highlightPro && !isActive && (
                <span className="absolute right-2 top-0 h-2 w-2 rounded-full bg-[#fa4141]" />
              )}
              {tab.icon(isActive)}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function screenToNavTab(screen: AppScreen): NavTab | null {
  if (screen === "home" || screen === "records") return "home";
  if (["workout", "style", "mode", "settings", "opponent", "category", "session-setup"].includes(screen)) return "train";
  if (screen === "challenges") return "challenges";
  if (screen === "paywall") return "pro";
  return null;
}
