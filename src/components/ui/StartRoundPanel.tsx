"use client";

interface StartRoundPanelProps {
  sessionCount: number;
  bestScore: number;
  onQuickStart: () => void;
  onCustomStart: () => void;
  onTrainOpponent?: () => void;
}

export function StartRoundPanel({
  sessionCount,
  bestScore,
  onQuickStart,
  onCustomStart,
  onTrainOpponent,
}: StartRoundPanelProps) {
  const isNew = sessionCount === 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0a0a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(250,65,65,0.12),transparent_55%)]" />

      <div className="relative p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="label text-[#525252]">
              {isNew ? "New here" : "Today's session"}
            </p>
            <h2 className="mt-2 font-display text-[2rem] leading-[0.95] tracking-wide text-white">
              {isNew ? (
                <>
                  Quick
                  <br />
                  start
                </>
              ) : (
                <>
                  Start
                  <br />
                  round
                </>
              )}
            </h2>
            {isNew && (
              <p className="mt-2 text-sm text-[#737373]">
                2 min · easy · coach guides you
              </p>
            )}
          </div>

          <div className="flex shrink-0 gap-6 text-right">
            <div>
              <p className="font-display text-2xl leading-none text-white">
                {sessionCount > 0 ? sessionCount : "—"}
              </p>
              <p className="label mt-1.5 text-[#525252]">Sessions</p>
            </div>
            {bestScore > 0 && (
              <div>
                <p className="font-display text-2xl leading-none text-white">{bestScore}</p>
                <p className="label mt-1.5 text-[#525252]">Best</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={isNew ? onQuickStart : onCustomStart}
          className="font-display mt-6 flex h-14 w-full items-center justify-center rounded-full bg-white text-[13px] tracking-[0.18em] text-black transition-transform active:scale-[0.98]"
        >
          {isNew ? "2-min easy round" : "Go"}
        </button>

        {isNew ? (
          <button
            type="button"
            onClick={onCustomStart}
            className="mt-3 w-full rounded-full border border-white/[0.12] py-3 text-sm text-[#737373] transition-colors hover:border-white/[0.2] hover:text-white"
          >
            Custom session
          </button>
        ) : null}

        {onTrainOpponent && (
          <button
            type="button"
            onClick={onTrainOpponent}
            className="mt-3 w-full rounded-full border border-white/[0.12] py-3.5 text-sm text-[#a3a3a3] transition-colors hover:border-white/[0.2] hover:text-white"
          >
            Train vs a fighter
          </button>
        )}
      </div>
    </section>
  );
}
