"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BAG_COPY } from "@/lib/bag-drill/copy";
import type { BagDrillMode, FightFloBagData } from "@/lib/bag-drill/types";
import type { BagHomeStartOptions } from "@/components/bag-drill/BagHomeScreen";
import { getSessionInsight } from "@/lib/bag-drill/insights";
import { getLastSession, topWeaknessMessage } from "@/lib/bag-drill/storage";

const DRILLS: {
  id: string;
  mode: BagDrillMode;
  options?: BagHomeStartOptions;
  title: string;
  detail: (weakness: string | null) => string;
  cta: string;
  badge?: string;
}[] = [
  {
    id: "combo",
    mode: "combo",
    title: BAG_COPY.quickStart.combo.title,
    detail: () => BAG_COPY.quickStart.combo.detail,
    cta: BAG_COPY.quickStart.combo.cta,
    badge: BAG_COPY.quickStart.combo.badge,
  },
  {
    id: "flurry",
    mode: "flurry",
    title: BAG_COPY.quickStart.flurry.title,
    detail: () => BAG_COPY.quickStart.flurry.detail,
    cta: BAG_COPY.quickStart.flurry.cta,
  },
  {
    id: "weakness",
    mode: "combo",
    options: { weaknessFocus: true },
    title: BAG_COPY.quickStart.weakness.title,
    detail: (weakness) =>
      weakness
        ? weakness.replace("You are slowest on: ", "Slow on: ")
        : BAG_COPY.quickStart.weakness.detailEmpty,
    cta: BAG_COPY.quickStart.weakness.cta,
  },
  {
    id: "speed",
    mode: "speed",
    title: BAG_COPY.quickStart.speed.title,
    detail: () => BAG_COPY.quickStart.speed.detail,
    cta: BAG_COPY.quickStart.speed.cta,
  },
];

interface DrillAccordionProps {
  number: number;
  title: string;
  detail: string;
  cta: string;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  onStart: () => void;
}

function DrillAccordion({
  number,
  title,
  detail,
  cta,
  badge,
  expanded,
  onToggle,
  onStart,
}: DrillAccordionProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        expanded
          ? "nike-card-selected border-[#fa4141]/40"
          : "nike-card border-white/[0.06]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <span className="font-display shrink-0 text-xl text-[#fa4141]/80">
          {String(number).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm text-white">{title}</p>
            {badge && (
              <span className="rounded-full border border-[#fa4141]/30 bg-[#fa4141]/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#fa4141]">
                {badge}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/35">
          {expanded ? "−" : BAG_COPY.drillMoreInfo}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 pl-[3.25rem]">
              <p className="text-sm leading-relaxed text-[#737373]">{detail}</p>
              <button
                type="button"
                onClick={onStart}
                className="font-display mt-4 flex h-11 w-full items-center justify-center rounded-full bg-[#fa4141] text-[11px] tracking-[0.14em] text-white"
              >
                {cta}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BagQuickDrillsProps {
  data: FightFloBagData;
  onStart: (mode: BagDrillMode, options?: BagHomeStartOptions) => void;
}

export function BagQuickDrills({ data, onStart }: BagQuickDrillsProps) {
  const weakness = topWeaknessMessage(data, 2);
  const [expandedId, setExpandedId] = useState<string | null>("combo");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04, duration: 0.4 }}
      className="space-y-2"
    >
      <div>
        <p className="label text-[#fa4141]">{BAG_COPY.startTrainingLabel}</p>
        <p className="mt-1 text-sm text-white/50">{BAG_COPY.startTrainingHint}</p>
      </div>

      {DRILLS.map((drill, index) => (
        <DrillAccordion
          key={drill.id}
          number={index + 1}
          title={drill.title}
          detail={drill.detail(weakness)}
          cta={drill.cta}
          badge={drill.badge}
          expanded={expandedId === drill.id}
          onToggle={() =>
            setExpandedId((current) => (current === drill.id ? null : drill.id))
          }
          onStart={() => onStart(drill.mode, drill.options)}
        />
      ))}
    </motion.div>
  );
}

interface BagLastRoundProps {
  data: FightFloBagData;
  onStart: (mode: BagDrillMode, options?: BagHomeStartOptions) => void;
}

export function BagLastRound({ data, onStart }: BagLastRoundProps) {
  const last = getLastSession(data);
  if (!last) return null;

  const insight = getSessionInsight(last, data);
  const suggestWeakness =
    last.sessionType !== "flurry" && data.sessions.length >= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4 }}
      className="nike-card rounded-2xl p-4"
    >
      <p className="label text-[#525252]">Last round</p>
      <p className="font-display mt-2 text-lg text-white">{insight.headline}</p>
      <p className="mt-1 text-sm leading-relaxed text-[#737373]">{insight.detail}</p>
      {suggestWeakness ? (
        <button
          type="button"
          onClick={() => onStart("combo", { weaknessFocus: true })}
          className="font-display mt-4 flex h-11 w-full items-center justify-center rounded-full border border-[#fa4141]/35 text-[11px] tracking-[0.14em] text-[#fa4141]"
        >
          Run weakness drill next
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onStart(last.sessionType === "flurry" ? "combo" : "flurry")}
          className="font-display mt-4 flex h-11 w-full items-center justify-center rounded-full border border-white/15 text-[11px] tracking-[0.14em] text-white/70"
        >
          {last.sessionType === "flurry" ? "Try called combos" : "Try flurry"}
        </button>
      )}
    </motion.div>
  );
}
