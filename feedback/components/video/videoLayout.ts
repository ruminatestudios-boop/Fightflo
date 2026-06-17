/** Map normalized pose coords (0–1 on source video) to canvas pixels */
export type VideoObjectFit = "contain" | "cover";

export interface VideoContentRect {
  offsetX: number;
  offsetY: number;
  drawWidth: number;
  drawHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  fit: VideoObjectFit;
  /** Match CSS scaleX(-1) on the video element */
  mirror: boolean;
}

export interface VideoLayoutOptions {
  fit?: VideoObjectFit;
  mirror?: boolean;
}

export function computeVideoContentRect(
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fit: VideoObjectFit = "contain",
  mirror = false
): VideoContentRect {
  const vw = videoWidth || 16;
  const vh = videoHeight || 9;
  const scale =
    fit === "cover"
      ? Math.max(canvasWidth / vw, canvasHeight / vh)
      : Math.min(canvasWidth / vw, canvasHeight / vh);

  const drawWidth = vw * scale;
  const drawHeight = vh * scale;

  return {
    offsetX: (canvasWidth - drawWidth) / 2,
    offsetY: (canvasHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
    canvasWidth,
    canvasHeight,
    fit,
    mirror,
  };
}

export function getVideoContentRect(
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  options: VideoLayoutOptions = {}
): VideoContentRect {
  return computeVideoContentRect(
    video.videoWidth,
    video.videoHeight,
    canvasWidth,
    canvasHeight,
    options.fit ?? "contain",
    options.mirror ?? false
  );
}

export function mapLandmarkToCanvas(
  point: { x: number; y: number },
  layout: VideoContentRect
): { x: number; y: number } {
  const nx = layout.mirror ? 1 - point.x : point.x;
  return {
    x: layout.offsetX + nx * layout.drawWidth,
    y: layout.offsetY + point.y * layout.drawHeight,
  };
}
