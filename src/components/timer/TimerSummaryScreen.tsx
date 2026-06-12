"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { TimerEmailCaptureFields } from "@/components/timer/TimerEmailCaptureFields";
import { useTimerEmailCapture } from "@/hooks/useTimerEmailCapture";
import { shouldShowEmailCapture } from "@/lib/boxing-timer/email-capture-storage";
import { recordFlowBagClick } from "@/lib/boxing-timer/upsell-storage";
import type { TimerSessionStats } from "@/lib/boxing-timer/types";

interface TimerSummaryScreenProps {
  stats: TimerSessionStats;
  isPro?: boolean;
  onAgain: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TimerSummaryScreen({
  stats,
  isPro = false,
  onAgain,
}: TimerSummaryScreenProps) {
  const finished = stats.roundsCompleted >= stats.totalRounds;
  const showEmail = shouldShowEmailCapture(isPro);
  const [skipped, setSkipped] = useState(false);
  const capture = useTimerEmailCapture();

  const handleSubmit = async () => {
    await capture.submit("post_session");
  };

  const showCaptureBlock =
    showEmail && !skipped && capture.status !== "success" && capture.status !== "already";

  return (
    <div className="app-shell flex h-dvh flex-col overflow-y-auto overscroll-y-contain bg-black px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        <div className="text-center">
          <p className="label text-[#ff0000]">
            {finished ? "Session complete" : "Session ended"}
          </p>
          <h1 className="font-display mt-3 text-3xl tracking-wide text-white">
            {finished ? "Work done." : `${stats.roundsCompleted} rounds`}
          </h1>
          <p className="mt-2 text-sm text-[#737373]">{stats.label}</p>
        </div>

        <div className="mx-auto mt-8 grid w-full max-w-xs grid-cols-2 gap-3">
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
        </div>

        {showCaptureBlock && (
          <div className="mx-auto mt-10 w-full max-w-sm flex-1 text-center">
            <h2 className="font-display text-2xl leading-tight tracking-wide text-white">
              Want AI to score your bag work?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#a3a3a3]">
              Get free access to FlowBag — AI that watches you on the bag,
              detects combos and catches when your guard drops.
            </p>
            <div className="mt-8">
              <TimerEmailCaptureFields
                email={capture.email}
                onEmailChange={(v) => {
                  capture.setEmail(v);
                  capture.resetError();
                }}
                status={capture.status}
                onSubmit={() => void handleSubmit()}
              />
            </div>
            <button
              type="button"
              onClick={() => setSkipped(true)}
              className="mt-8 text-xs text-[#525252] hover:text-[#737373]"
            >
              No thanks
            </button>
          </div>
        )}

        {(capture.status === "success" || capture.status === "already") && showEmail && (
          <div className="mx-auto mt-10 w-full max-w-sm">
            <TimerEmailCaptureFields
              email={capture.email}
              onEmailChange={capture.setEmail}
              status={capture.status}
              onSubmit={() => {}}
            />
          </div>
        )}

        {(!showCaptureBlock || skipped) &&
          capture.status !== "success" &&
          capture.status !== "already" && (
            <div className="mx-auto mt-10 w-full max-w-xs space-y-3">
              {!isPro && skipped && (
                <Link href="/bag" onClick={() => recordFlowBagClick()} className="block">
                  <Button variant="secondary">Try FlowBag free</Button>
                </Link>
              )}
              <Button onClick={onAgain}>New session</Button>
              {isPro && (
                <Link href="/bag" className="block">
                  <Button variant="secondary">Open FlowBag</Button>
                </Link>
              )}
            </div>
          )}

        {(capture.status === "success" || capture.status === "already") && (
          <div className="mx-auto mt-6 w-full max-w-xs">
            <Button variant="outline" onClick={onAgain}>
              New session
            </Button>
          </div>
        )}

        <div className="mt-auto pt-8 text-center">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.14em] text-[#525252] hover:text-white"
          >
            Full FightFlo app
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
