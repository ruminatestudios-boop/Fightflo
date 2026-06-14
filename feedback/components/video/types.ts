import type { FrameLandmarks, TimelineFrame } from "@/types";

/** Single frame of pose landmarks synced to video time */
export type LandmarkFrame = TimelineFrame;

export interface Annotation {
  timestamp: string;
  timeSeconds: number;
  title: string;
  type: "positive" | "weakness" | "neutral";
  message?: string;
  jointHighlight?: keyof FrameLandmarks;
}

export interface WeaknessTimestamp {
  timestamp: string;
  timeSeconds: number;
  title: string;
}

export interface PositiveTimestamp {
  timestamp: string;
  timeSeconds: number;
  title: string;
}

export interface TimelineMoment {
  id: string;
  timestamp: string;
  timeSeconds: number;
  title: string;
  kind: "positive" | "weakness";
}

export interface OverlayMeasurement {
  label: string;
  value: string;
}

export interface SkeletonDrawOptions {
  width: number;
  height: number;
  guardDropped?: boolean;
  highlightedJoint?: keyof FrameLandmarks;
  flashGuardLine?: boolean;
  layout?: import("./videoLayout").VideoContentRect;
  pulsePhase?: number;
}
