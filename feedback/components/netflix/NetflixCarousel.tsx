"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface NetflixSlide {
  id: string;
  content: ReactNode;
}

interface NetflixCarouselProps {
  slides: NetflixSlide[];
  onSlideChange?: (index: number) => void;
}

export function NetflixCarousel({ slides, onSlideChange }: NetflixCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(0, Math.min(slides.length - 1, idx));
    setActiveIndex(clamped);
    onSlideChange?.(clamped);
  }, [slides.length, onSlideChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateIndex, { passive: true });
    return () => el.removeEventListener("scroll", updateIndex);
  }, [updateIndex]);

  const goTo = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col pt-[max(3.5rem,env(safe-area-inset-top))]">
      <div className="absolute left-0 right-0 top-[max(3.25rem,env(safe-area-inset-top))] z-30 flex gap-1 px-4">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(i)}
            className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20"
            aria-label={`Go to slide ${i + 1}`}
          >
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{
                width: i <= activeIndex ? "100%" : "0%",
                opacity: i <= activeIndex ? 1 : 0.35,
              }}
            />
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="netflix-track scrollbar-none flex h-full flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
      >
        {slides.map((slide) => (
          <section
            key={slide.id}
            className="netflix-slide snap-center snap-always shrink-0"
          >
            {slide.content}
          </section>
        ))}
      </div>

      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-0 right-0 z-30 flex flex-col items-center gap-2 pointer-events-none">
        <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">
          Swipe
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md disabled:opacity-20"
            aria-label="Previous"
          >
            ‹
          </button>
          <span className="font-mono text-xs text-white/50">
            {activeIndex + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={() => goTo(Math.min(slides.length - 1, activeIndex + 1))}
            disabled={activeIndex === slides.length - 1}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md disabled:opacity-20"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
