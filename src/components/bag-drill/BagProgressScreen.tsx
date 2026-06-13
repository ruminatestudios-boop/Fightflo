"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { BagScreenWrapper } from "@/components/bag-drill/BagScreenWrapper";
import { StreakCalendar } from "@/components/bag-drill/StreakCalendar";
import { BagStatCard, CHART_COLORS } from "@/components/bag-drill/bag-ui";
import type { FightFloBagData } from "@/lib/bag-drill/types";
import { averageReactionTime, topWeaknesses } from "@/lib/bag-drill/weakness";
import { getSessionsLast30Days, weeklyImprovementPercent } from "@/lib/bag-drill/storage";
import {
  getAccuracyTrend30d,
  getReactionTrend30d,
} from "@/lib/bag-drill/insights";

interface BagProgressScreenProps {
  data: FightFloBagData;
  onHome?: () => void;
}

export function BagProgressScreen({ data, onHome }: BagProgressScreenProps) {
  const weekly = weeklyImprovementPercent(data);
  const weaknessBars = topWeaknesses(data.weaknesses, 6).map((combo) => ({
    combo: combo.length > 12 ? `${combo.slice(0, 10)}…` : combo,
    avg: Math.round(averageReactionTime(data.weaknesses[combo] ?? []) * 100) / 100,
  }));

  const reaction30 = getReactionTrend30d(data);
  const accuracy30 = getAccuracyTrend30d(data);
  const sessions30 = getSessionsLast30Days(data);
  const comboSessions = sessions30.filter((s) => s.sessionType !== "flurry");

  const avgAccuracy =
    comboSessions.length > 0
      ? Math.round(
          comboSessions.reduce((s, x) => s + x.accuracyPercent, 0) /
            comboSessions.length
        )
      : null;

  const { allTimeStats } = data;

  return (
    <BagScreenWrapper hubScreen onHome={onHome} className="overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="label text-[#525252]">Progress</p>
        <h1 className="font-display mt-2 text-2xl tracking-wide text-white">
          Streak &amp; stats
        </h1>

        {data.sessions.length > 0 && (
          <div className="nike-card mt-8 rounded-2xl p-5">
            <StreakCalendar data={data} />
          </div>
        )}

        <p className="mt-6 text-sm text-[#737373]">
          {sessions30.length} session{sessions30.length === 1 ? "" : "s"} in the
          last month.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2">
          <BagStatCard
            label="Fastest reaction"
            value={
              allTimeStats.fastestReaction != null
                ? `${allTimeStats.fastestReaction}s`
                : "—"
            }
            accent
          />
          <BagStatCard
            label="Avg combo match"
            value={avgAccuracy != null ? `${avgAccuracy}%` : "—"}
          />
          <BagStatCard label="Best streak" value={`${allTimeStats.longestStreak}d`} />
          <BagStatCard
            label="Best 30s flurry"
            value={
              allTimeStats.bestFlurry30 != null
                ? String(allTimeStats.bestFlurry30)
                : "—"
            }
          />
        </div>

        {weekly != null && (
          <div className="nike-card mt-4 rounded-xl p-4">
            <p className="label text-[#525252]">This week vs last</p>
            <p className="mt-2 text-sm text-emerald-400/90">
              {weekly > 0
                ? `${weekly}% faster reactions`
                : weekly < 0
                  ? `${Math.abs(weekly)}% slower`
                  : "Holding steady"}
            </p>
          </div>
        )}

        {reaction30.length >= 2 && (
          <div className="mt-8 h-48">
            <p className="label mb-3 text-[#525252]">Reaction time (30 days)</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reaction30}>
                <XAxis dataKey="label" stroke={CHART_COLORS.grid} fontSize={10} tickLine={false} />
                <YAxis stroke={CHART_COLORS.grid} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: CHART_COLORS.tooltipBg,
                    border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke={CHART_COLORS.line}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.line, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {accuracy30.length >= 2 && (
          <div className="mt-8 h-48">
            <p className="label mb-3 text-[#525252]">Combo match (30 days)</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracy30}>
                <XAxis dataKey="label" stroke={CHART_COLORS.grid} fontSize={10} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  stroke={CHART_COLORS.grid}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: CHART_COLORS.tooltipBg,
                    border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#4ade80"
                  strokeWidth={2}
                  dot={{ fill: "#4ade80", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {weaknessBars.length > 0 && (
          <div className="mt-8 h-52">
            <p className="label mb-3 text-[#525252]">Slowest combos</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weaknessBars} layout="vertical" margin={{ left: 4 }}>
                <XAxis type="number" stroke={CHART_COLORS.grid} fontSize={10} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="combo"
                  stroke={CHART_COLORS.grid}
                  width={72}
                  fontSize={9}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: CHART_COLORS.tooltipBg,
                    border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="avg" fill={CHART_COLORS.line} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.sessions.length === 0 && (
          <p className="mt-12 text-center text-sm text-[#525252]">
            Complete a session to see your progress.
          </p>
        )}
      </motion.div>
    </BagScreenWrapper>
  );
}
