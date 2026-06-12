"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { BagScreenWrapper } from "@/components/bag-drill/BagScreenWrapper";
import { BagStatCard, CHART_COLORS } from "@/components/bag-drill/bag-ui";
import type { BagSessionRecord, BagTrainingConfig, FightFloBagData } from "@/lib/bag-drill/types";
import {
  compareToLastSession,
  getSessionsLast7Days,
  weeklyImprovementPercent,
} from "@/lib/bag-drill/storage";
import {
  getNextSessionRecommendation,
  getSessionInsight,
} from "@/lib/bag-drill/insights";
import { PushReminderBanner } from "@/components/bag-drill/PushReminderBanner";

interface BagSummaryScreenProps {
  session: BagSessionRecord;
  data: FightFloBagData;
  isPro?: boolean;
  onTrainAgain: () => void;
  onStartRecommended: (config: Partial<BagTrainingConfig>) => void;
  onHome: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function BagSummaryScreen({
  session,
  data,
  onTrainAgain,
  onStartRecommended,
  onHome,
}: BagSummaryScreenProps) {
  const compare = compareToLastSession(session, data);
  const weekly = weeklyImprovementPercent(data);
  const chartSessions = getSessionsLast7Days(data).filter(
    (s) => s.sessionType !== "flurry"
  );
  const chartData = chartSessions.map((s, i) => ({
    name: `S${i + 1}`,
    avg: s.avgReactionTime,
  }));
  const insight = getSessionInsight(session, data);
  const next = getNextSessionRecommendation(session, data);
  const isFlurry = session.sessionType === "flurry";

  return (
    <BagScreenWrapper className="overflow-y-auto pb-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="label text-[#525252]">Session complete</p>
        <h1 className="font-display mt-2 text-3xl tracking-wide text-white">
          {isFlurry ? "Flurry done" : "Round done"}
        </h1>

        <div className="nike-card mt-6 rounded-xl p-4">
          <p className="label text-[#fa4141]">Insight</p>
          <p className="mt-2 font-display text-lg text-white">{insight.headline}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#737373]">
            {insight.detail}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {isFlurry ? (
            <>
              <BagStatCard label="Punches" value={String(session.totalPunches)} accent />
              <BagStatCard
                label="Duration"
                value={`${session.flurrySeconds ?? 30}s`}
              />
              <BagStatCard
                label="Rate"
                value={`${(session.totalPunches / Math.max(1, session.duration)).toFixed(1)}/s`}
              />
              <BagStatCard
                label="Peak"
                value={
                  session.flurryPeakRate
                    ? `${session.flurryPeakRate}/s`
                    : "—"
                }
              />
            </>
          ) : (
            <>
              <BagStatCard label="Time" value={formatDuration(session.duration)} />
              <BagStatCard label="Punches" value={String(session.totalPunches)} />
              <BagStatCard label="Avg reaction" value={`${session.avgReactionTime}s`} />
              <BagStatCard label="Accuracy" value={`${session.accuracyPercent}%`} accent />
              <BagStatCard label="Fastest" value={`${session.fastestReaction}s`} />
              {session.guardDrops != null && session.guardDrops > 0 && (
                <BagStatCard
                  label="Guard drops"
                  value={String(session.guardDrops)}
                />
              )}
            </>
          )}
        </div>

        {compare && !isFlurry && (
          <div className="nike-card mt-4 rounded-xl p-4 text-sm">
            <p className="label text-[#525252]">vs last session</p>
            <p className="mt-2 text-[#a3a3a3]">
              Reaction{" "}
              <span className={compare.avgDelta >= 0 ? "text-emerald-400" : "text-[#fa4141]"}>
                {compare.avgDelta >= 0 ? "↓" : "↑"} {Math.abs(compare.avgDelta).toFixed(2)}s
              </span>
            </p>
          </div>
        )}

        {weekly != null && data.sessions.length >= 2 && !isFlurry && (
          <p className="mt-3 text-sm text-emerald-400/90">
            {weekly > 0
              ? `${weekly}% faster than last week`
              : weekly < 0
                ? `${Math.abs(weekly)}% slower than last week`
                : "Same pace as last week"}
          </p>
        )}

        <p className="mt-4 text-sm text-white/50">
          <span className="text-[#fa4141]">{data.allTimeStats.currentStreak}-day</span> bag
          streak — don&apos;t break the chain.
        </p>

        {chartData.length >= 2 && !isFlurry && (
          <div className="mt-8 h-44">
            <p className="label mb-3 text-[#525252]">Last 7 sessions</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke={CHART_COLORS.grid} fontSize={11} tickLine={false} />
                <YAxis stroke={CHART_COLORS.grid} fontSize={11} tickLine={false} axisLine={false} />
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

        <div className="nike-card mt-8 rounded-xl p-4">
          <p className="label text-[#525252]">Next session</p>
          <p className="mt-2 font-display text-base text-white">{next.title}</p>
          <p className="mt-1 text-sm text-[#737373]">{next.detail}</p>
          <Button
            variant="secondary"
            size="md"
            className="mt-4 w-full"
            onClick={() => onStartRecommended(next.config)}
          >
            Start this workout
          </Button>
        </div>

        <PushReminderBanner />

        <div className="mt-6 space-y-3">
          <Button variant="outline" size="md" onClick={onTrainAgain}>
            Custom setup
          </Button>
          <Button variant="ghost" size="md" onClick={onHome}>
            Home
          </Button>
        </div>
      </motion.div>
    </BagScreenWrapper>
  );
}
