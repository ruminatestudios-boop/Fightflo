"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ProgressChartProps {
  data: { session: number; count: number; date: string }[];
  weaknessTitle: string;
}

export function ProgressChart({ data, weaknessTitle }: ProgressChartProps) {
  return (
    <div className="nike-card rounded-xl p-4">
      <p className="mb-4 text-xs text-[#737373]">Tracking: {weaknessTitle}</p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="session"
              stroke="#525252"
              tick={{ fill: "#737373", fontSize: 11 }}
            />
            <YAxis
              stroke="#525252"
              tick={{ fill: "#737373", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#fa4141"
              strokeWidth={2}
              dot={{ fill: "#fa4141", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
