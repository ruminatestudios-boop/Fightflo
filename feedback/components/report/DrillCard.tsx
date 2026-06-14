import type { DrillRecommendation } from "@/types";

interface DrillCardProps {
  drill: DrillRecommendation;
}

export function DrillCard({ drill }: DrillCardProps) {
  return (
    <div className="surface-card p-5">
      <h3 className="text-base font-medium text-white">{drill.name}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/45">
        {drill.description}
      </p>
      <div className="mt-4 rounded-2xl bg-black/30 px-4 py-3">
        <p className="text-[11px] text-white/35">Success marker</p>
        <p className="mt-1 text-sm text-white/60">{drill.success_marker}</p>
      </div>
    </div>
  );
}
