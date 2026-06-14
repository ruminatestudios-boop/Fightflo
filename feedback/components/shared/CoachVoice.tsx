import type { SportId } from "@/types";
import { getSportConfig } from "@/config/sports";

interface CoachVoiceProps {
  summary: string;
  sport: SportId;
}

export function CoachVoice({ summary, sport }: CoachVoiceProps) {
  const config = getSportConfig(sport);

  return (
    <div className="surface-card p-5">
      <p className="text-[11px] text-[#ff9500]/80">
        {config.coach_voice.replace(/_/g, " ")}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-white/75">
        &ldquo;{summary}&rdquo;
      </p>
    </div>
  );
}
