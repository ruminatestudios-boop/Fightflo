/** Map normalized pose coords (0–1 on source video) to canvas pixels with object-contain letterboxing */
export interface VideoContentRect {
  offsetX: number;
  offsetY: number;
  drawWidth: number;
  drawHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function computeVideoContentRect(
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
): VideoContentRect {
  const vw = videoWidth || 16;
  const vh = videoHeight || 9;
  const videoAspect = vw / vh;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth: number;
  let drawHeight: number;

  if (videoAspect > canvasAspect) {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / videoAspect;
  } else {
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * videoAspect;
  }

  return {
    offsetX: (canvasWidth - drawWidth) / 2,
    offsetY: (canvasHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
    canvasWidth,
    canvasHeight,
  };
}

export function getVideoContentRect(
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number
): VideoContentRect {
  return computeVideoContentRect(
    video.videoWidth,
    video.videoHeight,
    canvasWidth,
    canvasHeight
  );
}

export function mapLandmarkToCanvas(
  point: { x: number; y: number },
  layout: VideoContentRect
): { x: number; y: number } {
  return {
    x: layout.offsetX + point.x * layout.drawWidth,
    y: layout.offsetY + point.y * layout.drawHeight,
  };
}
