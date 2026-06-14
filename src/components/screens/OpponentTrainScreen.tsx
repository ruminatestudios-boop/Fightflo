"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { initCoachVoice, prefetchCoachLines } from "@/lib/coach-voice";
import { shortCoachLine } from "@/lib/coach-display";
import { fetchOpponentPlan } from "@/lib/opponent-api";
import {
  OPPONENT_EXAMPLES,
  type OpponentSessionPlan,
} from "@/lib/opponent-planner";
import { Button } from "@/components/ui/Button";
import { FighterResearchLoader, type FighterResearchStep } from "@/components/ui/FighterResearchLoader";
import { ChunkSection } from "@/components/ui/ChunkSection";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

interface OpponentTrainScreenProps {
  onBack: () => void;
  onStart: (plan: OpponentSessionPlan) => void;
  isPro?: boolean;
  freeSessionsLeft?: number;
  onPro?: () => void;
}

const RESEARCH_STEPS: FighterResearchStep[] = [
  {
    id: "research",
    label: "Reading the fighter",
    detail: "Searching style, stance, and signature habits",
  },
  {
    id: "rhythm",
    label: "Mapping their rhythm",
    detail: "Pressure bursts, feel-out phases, and reset moments",
  },
  {
    id: "plan",
    label: "Building your session",
    detail: "Game plan, round structure, and coaching cues",
  },
  {
    id: "voice",
    label: "Preparing coach voice",
    detail: "Loading audio for your corner between rounds",
  },
];

export function OpponentTrainScreen({
  onBack,
  onStart,
  isPro = false,
  freeSessionsLeft = 2,
  onPro,
}: OpponentTrainScreenProps) {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<OpponentSessionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState("");
  const [loadStep, setLoadStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runBuild = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (!isPro && freeSessionsLeft <= 0) {
      setError("Free AI sessions used — Pro unlocks unlimited.");
      return;
    }
    setLoading(true);
    setLoadingQuery(trimmed);
    setError(null);
    setPlan(null);
    setLoadStep(0);
    const stepTimer = setInterval(() => {
      setLoadStep((s) => Math.min(s + 1, RESEARCH_STEPS.length - 2));
    }, 2800);
    try {
      setLoadStep(0);
      await initCoachVoice("en");
      setLoadStep(1);
      const next = await fetchOpponentPlan(trimmed);
      setLoadStep(2);
      await prefetchCoachLines(
        [...next.sessionCoachCues, ...next.lowActivityCoaching],
        "en"
      );
      setLoadStep(RESEARCH_STEPS.length - 1);
      setPlan(next);
    } catch {
      setError("Could not build session. Try again.");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }, [isPro, freeSessionsLeft]);

  const buildPlan = useCallback(() => runBuild(query), [query, runBuild]);

  const canBuild = query.trim().length > 0;

  const aiBadge = useMemo(() => {
    if (!plan) return null;
    if (plan.planSource === "gemini") return "AI researched";
    if (plan.planSource === "preset" || plan.matchedPreset) return "Fight library";
    return "Style estimate";
  }, [plan]);

  return (
    <ScreenWrapper className="pb-24" onBack={onBack}>
      <ScreenHeader
        eyebrow="Fight prep"
        title="Train vs a fighter"
      />

      <p className="mt-4 text-sm text-[#737373]">
        Name a fighter — we build a solo session from their style.
        {!isPro && freeSessionsLeft > 0 && (
          <span className="text-[#525252]">
            {" "}
            · {freeSessionsLeft} free AI session{freeSessionsLeft === 1 ? "" : "s"} left
          </span>
        )}
      </p>

      <div className={`mt-5 transition-opacity duration-300 ${loading ? "pointer-events-none opacity-40" : ""}`}>
        <label htmlFor="opponent-input" className="sr-only">
          Fighter name
        </label>
        <input
          id="opponent-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPlan(null);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canBuild && !loading) void buildPlan();
          }}
          placeholder="Rodtang, Usyk, pressure southpaw…"
          className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-3.5 text-white placeholder:text-[#525252] outline-none focus:border-[#fa4141]/50"
          autoComplete="off"
          autoCapitalize="words"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {OPPONENT_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuery(example);
                void runBuild(example);
              }}
              className="rounded-xl border border-white/[0.08] px-3 py-1.5 text-xs text-[#a3a3a3] transition-colors hover:border-white/[0.15] hover:text-white disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {!plan && !loading && !isPro && freeSessionsLeft === 0 && (
        <div className="mt-8 rounded-2xl border border-[#fa4141]/25 bg-[#fa4141]/5 p-4">
          <p className="text-sm font-medium text-white">Free AI sessions used</p>
          <p className="mt-1 text-sm text-[#737373]">
            Pro unlocks unlimited fighter research and full history.
          </p>
          {onPro && (
            <button
              type="button"
              onClick={onPro}
              className="mt-3 text-sm font-medium text-[#fa4141]"
            >
              View Pro →
            </button>
          )}
        </div>
      )}

      {!plan && !loading && (isPro || freeSessionsLeft > 0) && (
        <div className="mt-8">
          <Button onClick={() => void buildPlan()} disabled={!canBuild}>
            Build session
          </Button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading && (
          <FighterResearchLoader
            key="research-loader"
            fighterName={loadingQuery}
            activeStep={loadStep}
            steps={RESEARCH_STEPS}
          />
        )}
      </AnimatePresence>

      {!loading && error && !plan && (isPro || freeSessionsLeft > 0) && (
        <p className="mt-3 text-sm text-[#fa4141]">{error}</p>
      )}

      <AnimatePresence mode="wait">
        {plan && !loading && (
          <motion.div
            key={plan.displayName}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-8 space-y-3"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#fa4141]">
                    {aiBadge}
                  </p>
                  <h2 className="font-display mt-1 text-2xl text-white">
                    vs {plan.displayName}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-[#737373]">
                  {plan.session.rounds.rounds}×{Math.round(plan.session.rounds.roundLength / 60)}m
                </span>
              </div>
              <p className="mt-2 text-sm text-[#a3a3a3]">{plan.styleSummary}</p>
            </div>

            <ChunkSection
              title="How they fight"
              summary={shortCoachLine(plan.intel.pacing, 8)}
              defaultOpen
            >
              <ul className="space-y-2">
                {plan.intel.tendencies.map((t) => (
                  <li key={t} className="text-sm text-[#a3a3a3]">
                    {shortCoachLine(t, 10)}
                  </li>
                ))}
              </ul>
            </ChunkSection>

            <ChunkSection
              title="Your focus"
              summary={shortCoachLine(plan.gameplan[0] ?? "", 8)}
            >
              <ol className="space-y-2">
                {plan.gameplan.map((line, i) => (
                  <li key={line} className="flex gap-2 text-sm text-[#d4d4d4]">
                    <span className="text-[#fa4141]">{i + 1}.</span>
                    {shortCoachLine(line, 12)}
                  </li>
                ))}
              </ol>
            </ChunkSection>

            <ChunkSection
              title="Quiet moments"
              summary={`${plan.lowActivityCoaching.length} coach cues`}
            >
              <ul className="space-y-1.5">
                {plan.lowActivityCoaching.map((line) => (
                  <li key={line} className="text-sm text-[#737373]">
                    {shortCoachLine(line, 8)}
                  </li>
                ))}
              </ul>
            </ChunkSection>

            <div className="flex flex-col gap-3 pt-2 pb-2">
              <Button onClick={() => onStart(plan)}>Start session</Button>
              <Button variant="outline" size="md" onClick={() => setPlan(null)}>
                Try another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
}
