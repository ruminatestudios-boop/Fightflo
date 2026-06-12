"use client";

import { LANGUAGES } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/types";

interface LanguageSelectProps {
  value: AppLanguage;
  onChange: (lang: AppLanguage) => void;
}

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  return (
    <div className="space-y-2">
      {LANGUAGES.map((lang) => {
        const selected = value === lang.id;

        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => onChange(lang.id)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
              selected
                ? "nike-card-selected"
                : "nike-card hover:border-white/[0.12]"
            }`}
          >
            <div>
              <p className="font-display text-lg text-white">{lang.label}</p>
              <p className="mt-0.5 text-sm text-[#737373]">{lang.subtitle}</p>
            </div>
            {selected && (
              <span className="text-sm font-medium text-[#FF3131]">Active</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
