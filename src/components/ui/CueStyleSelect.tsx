"use client";

import { CUE_STYLES } from "@/lib/constants";
import { isCueStylePro } from "@/lib/pro-gates";
import type { CueStyle } from "@/lib/types";
import { ProBadge } from "@/components/ui/ProBadge";

interface CueStyleSelectProps {
  value: CueStyle;
  onChange: (style: CueStyle) => void;
  isPro: boolean;
  onUpgrade: () => void;
}

export function CueStyleSelect({
  value,
  onChange,
  isPro,
  onUpgrade,
}: CueStyleSelectProps) {
  return (
    <div className="space-y-2">
      {CUE_STYLES.map((style) => {
        const locked = !isPro && isCueStylePro(style.id);
        const selected = value === style.id;

        return (
          <button
            key={style.id}
            type="button"
            onClick={() => {
              if (locked) {
                onUpgrade();
                return;
              }
              onChange(style.id);
            }}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
              selected
                ? "nike-card-selected"
                : locked
                  ? "nike-card opacity-75"
                  : "nike-card hover:border-white/[0.12]"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-lg text-white">{style.label}</p>
                {locked && <ProBadge />}
              </div>
              <p className="mt-1 text-sm text-[#737373]">{style.subtitle}</p>
            </div>
            <div
              className={`h-5 w-5 rounded-full border-2 ${
                selected ? "border-[#fa4141] bg-[#fa4141]" : "border-[#404040]"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
