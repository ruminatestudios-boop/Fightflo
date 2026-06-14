"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressDataPoint, WeaknessTrend } from "@/types";

const TREND_BAR: Record<WeaknessTrend, string> = {
  improving: "#34d399",
  stable: "rgba(255, 255, 255, 0.55)",
  worse: "#fa4141",
};

interface FaultProgressChartProps {
  points: ProgressDataPoint[];
  trend?: WeaknessTrend;
  height?: number;
  className?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: ProgressDataPoint }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const count = payload[0].value;

  return (
    <div className="home-chart-tooltip">
      <p className="home-chart-tooltip-label">Session {label}</p>
      {point.date ? <p className="home-chart-tooltip-date">{point.date}</p> : null}
      <p className="home-chart-tooltip-value">
        {count} fault{count === 1 ? "" : "s"} flagged
      </p>
    </div>
  );
}

export function FaultProgressChart({
  points,
  trend = "stable",
  height = 240,
  className = "",
}: FaultProgressChartProps) {
  const yMax = useMemo(() => {
    const peak = Math.max(...points.map((p) => p.count), 1);
    return Math.max(3, peak + 1);
  }, [points]);

  const barColor = TREND_BAR[trend];
  const lastSession = points[points.length - 1]?.session;

  return (
    <div className={`home-flow-chart ${className}`.trim()} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={points}
          margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 6"
          />
          <XAxis
            dataKey="session"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `#${value}`}
            dy={4}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, yMax]}
            tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
            label={{
              value: "Faults",
              angle: -90,
              position: "insideLeft",
              offset: 8,
              fill: "rgba(255,255,255,0.28)",
              fontSize: 10,
            }}
          />
          <Tooltip
            cursor={false}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="count"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
            activeBar={{ fill: barColor, opacity: 0.95 }}
          >
            {points.map((point) => (
              <Cell
                key={point.session}
                fill={barColor}
                opacity={point.session === lastSession ? 1 : 0.72}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="home-chart-caption">Sessions · lower is better</p>
    </div>
  );
}
