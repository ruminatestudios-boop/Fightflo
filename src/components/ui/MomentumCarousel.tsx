"use client";

export interface MomentumItem {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  done: boolean;
  onClick: () => void;
}

interface MomentumCarouselProps {
  items: MomentumItem[];
  doneCount: number;
  total: number;
}

export function MomentumCarousel({
  items,
  doneCount,
  total,
}: MomentumCarouselProps) {
  return (
    <section className="-mx-5">
      <div className="mb-5 flex items-end justify-between px-5">
        <div>
          <p className="label text-[#525252]">Your path</p>
          <h2 className="mt-1 font-display text-[1.35rem] leading-none tracking-wide text-white">
            Build your game
          </h2>
        </div>
        <p className="font-display text-sm tracking-widest text-[#525252]">
          {String(doneCount).padStart(2, "0")}
          <span className="text-[#3a3a3a]">/</span>
          {String(total).padStart(2, "0")}
        </p>
      </div>

      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Training milestones"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.done && item.id !== "workout"}
            className={`group relative w-[72vw] max-w-[17.5rem] shrink-0 snap-start overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 active:scale-[0.98] ${
              item.done
                ? "border-white/[0.04] bg-[#0d0d0d] opacity-45"
                : "border-white/[0.08] bg-gradient-to-b from-[#1a1a1a] to-[#080808] hover:border-white/[0.14]"
            }`}
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity ${
                item.done ? "opacity-0" : "bg-[#fa4141]/10 opacity-100 group-hover:bg-[#fa4141]/15"
              }`}
            />

            <div className="relative flex items-start justify-between">
              <span
                className={`font-display text-xs tracking-[0.2em] ${
                  item.done ? "text-[#525252]" : "text-[#fa4141]"
                }`}
              >
                {item.step}
              </span>
              {item.done && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                  <svg className="h-3 w-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </div>

            <p
              className={`relative mt-5 font-display text-xl leading-[1.05] tracking-wide ${
                item.done ? "text-[#525252]" : "text-white"
              }`}
            >
              {item.title}
            </p>
            <p className="relative mt-2 text-[13px] leading-snug text-[#737373]">
              {item.subtitle}
            </p>

            {!item.done && (
              <span className="relative mt-5 inline-flex items-center gap-1.5 font-display text-[11px] tracking-[0.15em] text-white/50 transition-colors group-hover:text-white/80">
                Start
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
