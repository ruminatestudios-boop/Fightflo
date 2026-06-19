"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  homeCardGradient,
  homeCardImage,
  homeCardUsesFeedPhoto,
} from "@/lib/home/cardImages";
import type { HomeFeatureId } from "@/components/home/HomeFeatureGrid";

const AUTO_ADVANCE_MS = 4500;

export interface HomeCarouselCard {
  id: HomeFeatureId;
  label: string;
  hint: string;
  disabled?: boolean;
  icon: ReactNode;
}

interface HomeFeatureCarouselProps {
  cards: HomeCarouselCard[];
  activeId: string;
  onSelect: (id: HomeFeatureId) => void;
  variant?: "default" | "fullscreen";
}

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <span className="glass-card-icon glass-card-icon--on-photo" aria-hidden>
      {children}
    </span>
  );
}

function CardPhoto({ id, active = false }: { id: HomeFeatureId; active?: boolean }) {
  const { src, position } = homeCardImage(id);

  return (
    <span className={`home-card-photo ${active ? "home-card-photo--active" : ""}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ objectPosition: position }} loading="lazy" />
      <span className="home-card-photo-overlay" />
    </span>
  );
}

function CardGradient({
  id,
  active = false,
}: {
  id: HomeFeatureId;
  active?: boolean;
}) {
  return (
    <span
      className={`home-card-gradient ${active ? "home-card-gradient--active" : ""}`}
      style={{ background: homeCardGradient(id) }}
      aria-hidden
    >
      <span className="home-card-gradient-shine" />
      <span className="home-card-gradient-overlay" />
    </span>
  );
}

export function HomeFeatureCarousel({
  cards,
  activeId,
  onSelect,
  variant = "default",
}: HomeFeatureCarouselProps) {
  const isFullscreen = variant === "fullscreen";
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pausedRef = useRef(false);
  const userInteractingRef = useRef(false);

  const activeCardId = cards[activeIndex]?.id ?? cards[0]?.id ?? "guard";
  const activeUsesPhoto = homeCardUsesFeedPhoto(activeCardId);

  const getSlides = useCallback((): HTMLElement[] => {
    const el = trackRef.current;
    if (!el) return [];
    return Array.from(
      el.querySelectorAll<HTMLElement>(".home-feature-carousel-slide")
    );
  }, []);

  const scrollLeftForIndex = useCallback(
    (index: number): number => {
      const el = trackRef.current;
      if (!el) return 0;
      const slides = getSlides();
      const slide = slides[index];
      if (!slide) return 0;
      const slideRect = slide.getBoundingClientRect();
      const trackRect = el.getBoundingClientRect();
      const slideCenter = slide.offsetLeft + slideRect.width / 2;
      const viewportCenter = trackRect.width / 2;
      return Math.max(0, slideCenter - viewportCenter);
    },
    [getSlides]
  );

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = trackRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(cards.length - 1, index));
      el.scrollTo({ left: scrollLeftForIndex(clamped), behavior });
      setActiveIndex(clamped);
    },
    [cards.length, scrollLeftForIndex]
  );

  const readIndexFromScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slides = getSlides();
    if (slides.length === 0) return;

    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const center = slide.offsetLeft + slide.clientWidth / 2;
      const dist = Math.abs(center - viewportCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setActiveIndex(Math.max(0, Math.min(cards.length - 1, best)));
  }, [cards.length, getSlides]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let settleTimer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(readIndexFromScroll, 110);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(settleTimer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [readIndexFromScroll]);

  useEffect(() => {
    if (cards.length <= 1) return;

    const timer = window.setInterval(() => {
      if (pausedRef.current || userInteractingRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % cards.length;
        const el = trackRef.current;
        if (el) {
          el.scrollTo({ left: scrollLeftForIndex(next), behavior: "smooth" });
        }
        return next;
      });
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [cards.length, scrollLeftForIndex]);

  const pause = () => {
    pausedRef.current = true;
  };

  const resume = () => {
    pausedRef.current = false;
  };

  const onInteractStart = () => {
    userInteractingRef.current = true;
    pause();
  };

  const onInteractEnd = () => {
    userInteractingRef.current = false;
    window.setTimeout(() => {
      pausedRef.current = false;
    }, AUTO_ADVANCE_MS);
  };

  return (
    <div
      className={`home-feature-carousel ${isFullscreen ? "home-feature-carousel--fullscreen home-feature-carousel--gradient" : ""}`}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={onInteractStart}
      onTouchEnd={onInteractEnd}
      onTouchCancel={onInteractEnd}
    >
      {isFullscreen ? (
        <div className="home-feature-carousel-backdrop" aria-hidden>
          {activeUsesPhoto ? (
            <div
              className="home-feature-carousel-backdrop-image"
              style={{
                backgroundImage: `url(${homeCardImage(activeCardId).src})`,
                backgroundPosition: homeCardImage(activeCardId).position,
              }}
            />
          ) : (
            <div
              className="home-feature-carousel-backdrop-gradient"
              style={{ background: homeCardGradient(activeCardId) }}
            />
          )}
          <div className="home-feature-carousel-backdrop-vignette" />
        </div>
      ) : null}

      <div
        ref={trackRef}
        className={`home-feature-carousel-track scrollbar-none ${isFullscreen ? "home-feature-carousel-track--fullscreen" : ""}`}
        aria-label="Training tools"
      >
        {cards.map((card, index) => {
          const usesPhoto = isFullscreen && homeCardUsesFeedPhoto(card.id);

          return (
          <div
            key={card.id}
            className={`home-feature-carousel-slide ${isFullscreen && index === activeIndex ? "home-feature-carousel-slide--active" : ""}`}
          >
            <button
              type="button"
              className={`glass-card home-feature-carousel-card ${isFullscreen ? `home-feature-carousel-card--fullscreen ${usesPhoto ? "glass-card--photo" : "glass-card--gradient"}` : "glass-card--photo"} ${activeId === card.id ? "glass-card--active" : ""} ${card.disabled ? "glass-card--disabled" : ""}`}
              onClick={() => !card.disabled && onSelect(card.id)}
              disabled={card.disabled}
            >
              {isFullscreen ? (
                usesPhoto ? (
                  <CardPhoto id={card.id} active={index === activeIndex} />
                ) : (
                  <CardGradient id={card.id} active={index === activeIndex} />
                )
              ) : (
                <CardPhoto id={card.id} />
              )}
              <div className="home-card-photo-content">
                <IconBadge>{card.icon}</IconBadge>
                <span className="glass-card-label">{card.label}</span>
                <span className="home-feature-hint">{card.hint}</span>
              </div>
            </button>
          </div>
          );
        })}
      </div>

      <div className={`home-feature-carousel-dots ${isFullscreen ? "home-feature-carousel-dots--fullscreen" : ""}`} aria-hidden>
        {cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            className={`home-feature-carousel-dot ${index === activeIndex ? "home-feature-carousel-dot--active" : ""}`}
            onClick={() => scrollToIndex(index)}
            aria-label={`Show ${card.label}`}
          />
        ))}
      </div>
    </div>
  );
}
