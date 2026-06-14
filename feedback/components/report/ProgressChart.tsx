"use client";

import { FaultProgressChart } from "@/components/charts/FaultProgressChart";
import type { ProgressDataPoint } from "@/types";

interface ProgressChartProps {
  data: ProgressDataPoint[];
  weaknessTitle: string;
}

export function ProgressChart({ data, weaknessTitle }: ProgressChartProps) {
  return (
    <div className="nike-card rounded-xl p-4">
      <p className="mb-3 text-xs text-[#737373]">Tracking: {weaknessTitle}</p>
      <FaultProgressChart points={data} className="home-flow-chart--embedded" />
    </div>
  );
}
