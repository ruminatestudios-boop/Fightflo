"use client";

import { motion } from "framer-motion";
import { GETTING_STARTED_STEPS, BAG_COPY } from "@/lib/bag-drill/copy";

const UNLOCKS = [
  { label: "Reaction time", detail: "Avg speed per combo" },
  { label: "Weak spots", detail: "Slowest sequences flagged" },
  { label: "Streak", detail: "Train consecutive days" },
] as const;

interface BagGettingStartedProps {
  /** First session done but stats still thin — encourage a full round */
  hasTriedOnce?: boolean;
}

export function BagGettingStarted({ hasTriedOnce = false }: BagGettingStartedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4 }}
      className="space-y-4"
    >
      <div>
        <p className="label text-[#525252]">
          {hasTriedOnce ? "Finish a full round" : "How it works"}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#737373]">
          {hasTriedOnce
            ? "One punch isn't enough to score you. Run a full boxing combo round — stats unlock below."
            : BAG_COPY.gettingStartedScored}
        </p>
      </div>

      <div className="space-y-2">
        {GETTING_STARTED_STEPS.map((item) => (
          <div
            key={item.step}
            className="nike-card flex gap-4 rounded-xl px-4 py-3.5"
          >
            <span className="font-display shrink-0 text-lg text-[#fa4141]/80">
              {item.step}
            </span>
            <div>
              <p className="font-display text-sm text-white">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="nike-card rounded-xl p-4">
        <p className="label text-[#fa4141]">After a few rounds</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {UNLOCKS.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/70">
                {item.label}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-[#525252]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
