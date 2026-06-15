"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

interface ImmersiveVideoStageProps {
  videoUrl: string;
  videoRef: RefObject<HTMLVideoElement>;
  playing: boolean;
  videoError: boolean;
  onTimeUpdate: (time: number) => void;
  onDuration: (duration: number) => void;
  onPlayState: (playing: boolean) => void;
  onError: () => void;
  onTogglePlay: () => void;
  children?: ReactNode;
}

export function ImmersiveVideoStage({
  videoUrl,
  videoRef,
  playing,
  videoError,
  onTimeUpdate,
  onDuration,
  onPlayState,
  onError,
  onTogglePlay,
  children,
}: ImmersiveVideoStageProps) {
  const bgRef = useRef<HTMLVideoElement>(null);

  const syncBackground = useCallback((time: number) => {
    const bg = bgRef.current;
    if (!bg || Math.abs(bg.currentTime - time) < 0.15) return;
    bg.currentTime = time;
  }, []);

  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;
    if (playing) void bg.play().catch(() => {});
    else bg.pause();
  }, [playing]);

  return (
    <div className="immersive-video-stage">
      <video
        ref={bgRef}
        src={videoUrl}
        className="immersive-video-bg"
        playsInline
        muted
        loop
        preload="metadata"
        aria-hidden
      />
      <video
        ref={videoRef}
        src={videoUrl}
        className="immersive-video-main"
        playsInline
        loop
        crossOrigin="anonymous"
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          onTimeUpdate(t);
          syncBackground(t);
        }}
        onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)}
        onPlay={() => onPlayState(true)}
        onPause={() => onPlayState(false)}
        onError={onError}
        onClick={onTogglePlay}
      />
      <div className="immersive-video-overlays">{children}</div>
      {videoError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 px-6 text-center">
          <p className="text-sm text-white/60">
            Video unavailable for this session. Upload again to replay with
            overlays.
          </p>
        </div>
      )}
    </div>
  );
}
