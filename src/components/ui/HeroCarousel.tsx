"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeroMedia } from "@/components/ui/HeroMedia";

export interface HeroSlideAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  detail?: string;
  image?: string;
  /** Gradient-only slide (e.g. Pro upsell) */
  gradient?: string;
  /** Red radial accent — matches DailyChallengeCard */
  accentGlow?: boolean;
  actions: HeroSlideAction[];
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  autoPlayMs?: number;
  variant?: "hero" | "compact";
}

export function HeroCarousel({
  slides,
  autoPlayMs = 6500,
  variant = "hero",
}: HeroCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pauseUntilRef = useRef(0);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    const slide = el.children[clamped] as HTMLElement | undefined;
    if (!slide) return;
    el.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    setActive(clamped);
  }, [slides.length]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.children.length === 0) return;
    const slideWidth = el.clientWidth;
    if (slideWidth <= 0) return;
    const index = Math.round(el.scrollLeft / slideWidth);
    setActive(Math.max(0, Math.min(index, slides.length - 1)));
  }, [slides.length]);

  const pauseAutoPlay = useCallback(() => {
    pauseUntilRef.current = Date.now() + 10000;
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || !autoPlayMs) return;

    const id = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setActive((current) => {
        const next = (current + 1) % slides.length;
        scrollTo(next);
        return next;
      });
    }, autoPlayMs);

    return () => window.clearInterval(id);
  }, [autoPlayMs, scrollTo, slides.length]);

  if (slides.length === 0) return null;

  const compact = variant === "compact";

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onTouchStart={pauseAutoPlay}
        onMouseDown={pauseAutoPlay}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label={compact ? "Coming later" : "Featured"}
      >
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            className={`relative w-full min-w-full shrink-0 snap-center snap-always overflow-hidden rounded-2xl ${
              compact ? "aspect-[2.2/1]" : "aspect-[4/3]"
            }`}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={active !== index}
          >
            {slide.image ? (
              <HeroMedia posterSrc={slide.image} overlay="bottom" />
            ) : (
              <>
                <div
                  className={`absolute inset-0 ${slide.gradient ?? "bg-gradient-to-br from-[#1a0808] via-[#111111] to-[#050505]"}`}
                />
                {slide.accentGlow && (
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(250,65,65,0.22),transparent_60%)]" />
                )}
              </>
            )}

            <div
              className={`absolute inset-0 flex flex-col justify-end ${
                compact ? "p-4" : "p-5"
              }`}
            >
              <p className={`label ${compact ? "text-white/55" : "text-white/70"}`}>
                {slide.eyebrow}
              </p>
              <h3
                className={`mt-1 whitespace-pre-line font-display text-white ${
                  compact ? "text-lg" : "text-2xl"
                }`}
              >
                {slide.title}
              </h3>
              {slide.detail && (
                <p
                  className={`mt-1 leading-relaxed text-white/55 ${
                    compact ? "line-clamp-2 text-xs" : "text-sm"
                  }`}
                >
                  {slide.detail}
                </p>
              )}
              {slide.actions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {slide.actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        pauseAutoPlay();
                        action.onClick();
                      }}
                      className={
                        action.primary
                          ? "rounded-full bg-[#fa4141] px-4 py-2 text-sm font-medium text-white"
                          : "rounded-full border border-white/30 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => {
                pauseAutoPlay();
                scrollTo(index);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                active === index ? "w-6 bg-[#fa4141]" : "w-1.5 bg-[#3a3a3a] hover:bg-[#525252]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
