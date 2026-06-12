"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { TimerSessionStats } from "@/lib/boxing-timer/types";

interface TimerSummaryScreenProps {
  stats: TimerSessionStats;
  onAgain: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TimerSummaryScreen({ stats, onAgain }: TimerSummaryScreenProps) {
  const finished = stats.roundsCompleted >= stats.totalRounds;

  return (
    <div className="app-shell flex h-dvh flex-col overflow-y-auto overscroll-y-contain bg-black px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        <p className="label text-[#fa4141]">
          {finished ? "Session complete" : "Session ended"}
        </p>
        <h1 className="font-display mt-3 text-3xl tracking-wide text-white">
          {finished ? "Work done." : `${stats.roundsCompleted} rounds`}
        </h1>
        <p className="mt-2 text-sm text-[#737373]">{stats.label}</p>

        <div className="mt-10 grid w-full max-w-xs grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.08] p-4">
            <p className="label text-[#525252]">Rounds</p>
            <p className="font-display mt-1 text-2xl text-white">
              {stats.roundsCompleted}/{stats.totalRounds}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] p-4">
            <p className="label text-[#525252]">Time</p>
            <p className="font-display mt-1 text-2xl text-white">
              {formatDuration(stats.durationSeconds)}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-white/[0.08] p-4">
            <p className="label text-[#525252]">Work in the tank</p>
            <p className="font-display mt-1 text-2xl text-white">
              {formatDuration(stats.totalWorkSeconds)}
            </p>
            <p className="mt-1 text-xs text-[#737373]">
              {stats.comboPulses
                ? "Combo callouts were on"
                : "Timer only — no callouts"}
            </p>
          </div>
        </div>

        <div className="mt-10 w-full max-w-xs space-y-3">
          <Button onClick={onAgain}>Train again</Button>
          <Link href="/bag" className="block">
            <Button variant="secondary">Score punches with FlowBag</Button>
          </Link>
          <Link href="/" className="block">
            <Button variant="ghost">Full FightFlo app</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
