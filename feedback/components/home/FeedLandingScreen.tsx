"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { FEED_LANDING_COPY } from "@/lib/copy";
import {
  FEED_LANDING_HERO,
  FEED_LANDING_ORBIT_IMAGES,
} from "@/lib/home/feedLandingImages";

type LandingPhase = "orbit" | "merge" | "settled";

interface FeedLandingScreenProps {
  onContinue: () => void;
}

export function FeedLandingScreen({ onContinue }: FeedLandingScreenProps) {
  const [phase, setPhase] = useState<LandingPhase>("orbit");
  const count = FEED_LANDING_ORBIT_IMAGES.length;

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setPhase("settled");
      return;
    }

    const mergeTimer = window.setTimeout(() => setPhase("merge"), 900);
    const settleTimer = window.setTimeout(() => setPhase("settled"), 2400);

    return () => {
      window.clearTimeout(mergeTimer);
      window.clearTimeout(settleTimer);
    };
  }, []);

  return (
    <div className="feed-landing" role="dialog" aria-label="Welcome to Fightflo">
      <header className="feed-landing-brand">
        <span className="feed-landing-brand-mark" aria-hidden />
        <span className="feed-landing-brand-text">FIGHTFLO</span>
      </header>

      <div className="feed-landing-stage" aria-hidden>
        <div className="feed-landing-orbit">
          {FEED_LANDING_ORBIT_IMAGES.map((image, index) => {
            const angle = (360 / count) * index;
            return (
              <div
                key={image.id}
                className={`feed-landing-orbit-item ${
                  phase !== "orbit" ? "feed-landing-orbit-item--merge" : ""
                }`}
                style={
                  {
                    "--orbit-angle": `${angle}deg`,
                    "--orbit-delay": `${index * 45}ms`,
                  } as CSSProperties
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="" style={{ objectPosition: image.position }} />
              </div>
            );
          })}

          <div
            className={`feed-landing-hero ${
              phase === "settled" ? "feed-landing-hero--visible" : ""
            } ${phase === "merge" ? "feed-landing-hero--forming" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FEED_LANDING_HERO.src}
              alt=""
              style={{ objectPosition: FEED_LANDING_HERO.position }}
            />
          </div>
        </div>
      </div>

      <div
        className={`feed-landing-copy ${
          phase === "settled" ? "feed-landing-copy--visible" : ""
        }`}
      >
        <p className="feed-landing-eyebrow">{FEED_LANDING_COPY.eyebrow}</p>
        <h1 className="feed-landing-title">{FEED_LANDING_COPY.headline}</h1>
        <p className="feed-landing-body">{FEED_LANDING_COPY.body}</p>
        <button type="button" className="feed-landing-cta" onClick={onContinue}>
          {FEED_LANDING_COPY.cta}
        </button>
      </div>
    </div>
  );
}
