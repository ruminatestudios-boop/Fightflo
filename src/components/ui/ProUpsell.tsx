"use client";

import { Button } from "@/components/ui/Button";

interface ProUpsellProps {
  onUpgrade: () => void;
  compact?: boolean;
}

export function ProUpsell({ onUpgrade, compact = false }: ProUpsellProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onUpgrade}
        className="font-display mt-3 w-full rounded-xl border border-[#fa4141]/30 bg-[#fa4141]/10 px-4 py-3 text-[11px] tracking-[0.14em] text-[#fa4141] transition-colors hover:bg-[#fa4141]/15"
      >
        Unlock Pro →
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#fa4141]/20 bg-gradient-to-br from-[#fa4141]/10 to-transparent p-5">
      <p className="font-display text-lg tracking-wide text-white">fightflo Pro</p>
      <p className="mt-2 text-sm text-[#8e9297]">
        Stadium mode, advanced signals, all rhythm archetypes, gym ambience.
      </p>
      <div className="mt-4">
        <Button size="md" onClick={onUpgrade}>
          View plans
        </Button>
      </div>
    </div>
  );
}
