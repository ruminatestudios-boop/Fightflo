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

/** Color each bar by how good/bad that session's value was, not just overall trend */
function barColorForCount(count: number, yMax: number, lowerIsBetter: boolean): string {
  if (count === 0) return lowerIsBetter ? "#34d399" : "#fa4141";

  const ratio = count / yMax;
  const bad = lowerIsBetter ? ratio : 1 - ratio;

  if (bad <= 0.34) return "#34d399";
  if (bad <= 0.67) return "#fbbf24";
  return "#fa4141";
}

interface FaultProgressChartProps {
  points: ProgressDataPoint[];
  trend?: WeaknessTrend;
  metricLabel?: string;
  unit?: string;
  lowerIsBetter?: boolean;
  height?: number;
  maxSessions?: number;
  className?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  metricLabel,
  unit,
}: {
  active?: boolean;
  payload?: { value: number; payload: ProgressDataPoint }[];
  label?: string | number;
  metricLabel?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const count = payload[0].value;

  return (
    <div className="home-chart-tooltip">
      <p className="home-chart-tooltip-label">Session {label}</p>
      {point.date ? <p className="home-chart-tooltip-date">{point.date}</p> : null}
      <p className="home-chart-tooltip-value">
        {count} {unit ?? "points"}
      </p>
      {metricLabel ? (
        <p className="home-chart-tooltip-meta">{metricLabel}</p>
      ) : null}
    </div>
  );
}

export function FaultProgressChart({
  points,
  trend = "stable",
  metricLabel,
  unit = "points",
  lowerIsBetter = true,
  height = 240,
  maxSessions,
  className = "",
}: FaultProgressChartProps) {
  const chartPoints = useMemo(() => {
    if (!maxSessions || points.length <= maxSessions) return points;
    return points.slice(-maxSessions);
  }, [maxSessions, points]);

  const yMax = useMemo(() => {
    const peak = Math.max(...chartPoints.map((p) => p.count), 1);
    return Math.max(3, peak + 1);
  }, [chartPoints]);

  const lastSession = chartPoints[chartPoints.length - 1]?.session;
  const trimmed = maxSessions && points.length > maxSessions;

  return (
    <div className={`home-flow-chart ${className}`.trim()} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartPoints}
          margin={{ top: 8, right: 8, left: -2, bottom: 4 }}
          barCategoryGap="32%"
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
            tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={22}
          />
          <Tooltip
            cursor={false}
            content={<ChartTooltip metricLabel={metricLabel} unit={unit} />}
          />
          <Bar
            dataKey="count"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          >
            {chartPoints.map((point) => (
              <Cell
                key={point.session}
                fill={barColorForCount(point.count, yMax, lowerIsBetter)}
                opacity={point.session === lastSession ? 1 : 0.78}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="home-chart-caption">
        {lowerIsBetter ? "Lower is better" : "Higher is better"}
        {trimmed ? ` · last ${maxSessions} of ${points.length} sessions` : " · per session"}
      </p>
    </div>
  );
}
