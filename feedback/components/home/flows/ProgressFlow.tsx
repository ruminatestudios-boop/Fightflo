"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressInsight } from "@/lib/insights/types";
import { FlowEmpty, FlowPanel, FlowShell } from "../FlowShell";

interface ProgressFlowProps {
  insight: ProgressInsight | null;
  onBack: () => void;
}

export function ProgressFlow({ insight, onBack }: ProgressFlowProps) {
  return (
    <FlowShell title="Your progress" subtitle="Faults over time" onBack={onBack}>
      {!insight ? (
        <FlowEmpty message="Complete at least one analysis to start tracking progress." />
      ) : (
        <>
          <FlowPanel>
            <p className="home-flow-eyebrow">{insight.weaknessLabel}</p>
            <p className="home-flow-body">{insight.summary}</p>
            <p className="home-flow-stat">
              Trend:{" "}
              <span className={`home-flow-trend home-flow-trend--${insight.trend}`}>
                {insight.trend}
              </span>
            </p>
          </FlowPanel>
          <div className="home-flow-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={insight.points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="session"
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Session", position: "insideBottom", offset: -2, fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(session) => `Session ${session}`}
                />
                <Bar dataKey="count" fill="#fa4141" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </FlowShell>
  );
}
