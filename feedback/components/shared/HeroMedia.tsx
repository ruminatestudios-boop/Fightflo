"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/paths";

interface HeroMediaProps {
  videoSrc?: string;
  fallbackVideoSrc?: string;
  posterSrc?: string;
  overlay?: "bottom" | "full" | "strava";
  className?: string;
  eager?: boolean;
}

export function HeroMedia({
  videoSrc,
  fallbackVideoSrc,
  posterSrc,
  overlay = "bottom",
  className = "",
  eager = false,
}: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    const markReady = () => setVideoReady(true);
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("playing", markReady);

    const fallback = window.setTimeout(
      () => setVideoReady(true),
      eager ? 800 : 2000
    );

    video.play().catch(() => {
      setVideoReady(true);
    });

    return () => {
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("playing", markReady);
      window.clearTimeout(fallback);
    };
  }, [videoSrc, eager]);

  const gradient =
    overlay === "strava"
      ? "bg-gradient-to-t from-black via-black/50 to-black/20"
      : overlay === "full"
        ? "bg-gradient-to-b from-black/40 via-transparent to-black/85"
        : "bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent";

  return (
    <div className={`absolute inset-0 overflow-hidden bg-black ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0808] via-[#111111] to-[#050505]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(250,65,65,0.18),transparent_55%)]" />

      {posterSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={withBasePath(posterSrc)}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}

      {videoSrc ? (
        <video
          ref={videoRef}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-40"
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload={eager ? "auto" : "metadata"}
          poster={posterSrc ? withBasePath(posterSrc) : undefined}
        >
          <source src={videoSrc} type="video/mp4" />
          {fallbackVideoSrc ? (
            <source src={fallbackVideoSrc} type="video/mp4" />
          ) : null}
        </video>
      ) : null}

      <div className={`pointer-events-none absolute inset-0 ${gradient}`} />
    </div>
  );
}
