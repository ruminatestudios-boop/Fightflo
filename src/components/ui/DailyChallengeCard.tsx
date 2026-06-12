"use client";

import { motion } from "framer-motion";
import type { DailyChallenge } from "@/lib/daily-challenges";
import { Button } from "@/components/ui/Button";

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  onStart: () => void;
}

export function DailyChallengeCard({ challenge, onStart }: DailyChallengeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-[#fa4141]/20 bg-gradient-to-br from-[#1a0808] to-[#0a0a0a] p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(250,65,65,0.2),transparent_60%)]" />
      <div className="relative">
        <p className="label text-[#fa4141]">Daily challenge</p>
        <h3 className="font-display mt-2 text-2xl text-white">{challenge.name}</h3>
        <p className="mt-1 text-sm text-[#737373]">{challenge.tagline}</p>
        <div className="mt-5">
          <Button size="md" onClick={onStart}>
            Start today&apos;s session
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
