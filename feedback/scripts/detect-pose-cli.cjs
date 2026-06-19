"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/detect-pose-cli.ts
var import_promises = require("fs/promises");

// lib/analysis/extractFrames.ts
var import_fluent_ffmpeg2 = __toESM(require("fluent-ffmpeg"));

// lib/config/ffmpeg.ts
var import_fs = require("fs");
var import_child_process = require("child_process");
var import_os = require("os");
var import_path = require("path");
var import_fluent_ffmpeg = __toESM(require("fluent-ffmpeg"));
var import_ffmpeg_static = __toESM(require("ffmpeg-static"));
var resolvedFfmpegPath = null;
var resolvedFfprobePath = null;
function isExecutable(path) {
  try {
    (0, import_fs.accessSync)(path, import_fs.constants.X_OK);
    return true;
  } catch {
    return (0, import_fs.existsSync)(path);
  }
}
function getBundledFfmpegPath() {
  if (import_ffmpeg_static.default && (0, import_fs.existsSync)(import_ffmpeg_static.default)) return import_ffmpeg_static.default;
  try {
    const p = eval("require")("ffmpeg-static");
    if (p && (0, import_fs.existsSync)(p)) return p;
  } catch {
  }
  const os = (0, import_os.platform)();
  const cpu = (0, import_os.arch)();
  const name = os === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const roots = [
    "/var/task",
    "/var/task/.next/server",
    process.cwd(),
    (0, import_path.join)(process.cwd(), ".next/server"),
    (0, import_path.join)(process.cwd(), "feedback"),
    (0, import_path.dirname)((0, import_path.dirname)((0, import_path.dirname)(__dirname)))
    // traverse up from lib/config/ffmpeg.ts
  ];
  for (const root of roots) {
    const candidate = (0, import_path.join)(root, "node_modules", "ffmpeg-static", name);
    if ((0, import_fs.existsSync)(candidate)) return candidate;
    const nested = (0, import_path.join)(root, "node_modules", "ffmpeg-static", "bin", os, cpu, name);
    if ((0, import_fs.existsSync)(nested)) return nested;
  }
  return null;
}
function getFfmpegPath() {
  if (resolvedFfmpegPath) return resolvedFfmpegPath;
  const candidates = [
    process.env.FFMPEG_PATH,
    getBundledFfmpegPath(),
    (0, import_path.join)((0, import_os.homedir)(), "bin", "ffmpeg"),
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg"
  ].filter((p2) => Boolean(p2));
  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      resolvedFfmpegPath = candidate;
      import_fluent_ffmpeg.default.setFfmpegPath(candidate);
      return candidate;
    }
  }
  try {
    const found = (0, import_child_process.execSync)("which ffmpeg", { encoding: "utf8" }).trim();
    if (found && isExecutable(found)) {
      resolvedFfmpegPath = found;
      import_fluent_ffmpeg.default.setFfmpegPath(found);
      return found;
    }
  } catch {
  }
  throw new Error(
    "Cannot find ffmpeg. Install to ~/bin/ffmpeg or set FFMPEG_PATH in .env"
  );
}
function getFfprobePath(ffmpegPath) {
  if (resolvedFfprobePath) return resolvedFfprobePath;
  const ffmpegDir = ffmpegPath ? (0, import_path.dirname)(ffmpegPath) : null;
  const candidates = [
    process.env.FFPROBE_PATH,
    ffmpegDir ? (0, import_path.join)(ffmpegDir, "ffprobe") : null,
    (0, import_path.join)((0, import_os.homedir)(), "bin", "ffprobe"),
    "/opt/homebrew/bin/ffprobe",
    "/usr/local/bin/ffprobe"
  ].filter((p2) => Boolean(p2));
  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      resolvedFfprobePath = candidate;
      import_fluent_ffmpeg.default.setFfprobePath(candidate);
      return candidate;
    }
  }
  try {
    const found = (0, import_child_process.execSync)("which ffprobe", { encoding: "utf8" }).trim();
    if (found && isExecutable(found)) {
      resolvedFfprobePath = found;
      import_fluent_ffmpeg.default.setFfprobePath(found);
      return found;
    }
  } catch {
  }
  return null;
}
function configureFfmpeg() {
  const ffmpegPath = getFfmpegPath();
  getFfprobePath(ffmpegPath);
}

// lib/analysis/timestamps.ts
var FRAMES_PER_SECOND = 12;
function parseTimestamp(ts) {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
function frameToTimestamp(frameIndex) {
  const totalSeconds = Math.floor(frameIndex / FRAMES_PER_SECOND);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// lib/analysis/landmarkSmoothing.ts
var OneEuroFilter = class {
  constructor(freq, minCutoff = 1, beta = 7e-3, dCutoff = 1) {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
    this.freq = freq;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }
  alpha(cutoff) {
    const te = 1 / this.freq;
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / te);
  }
  filter(value, timestamp) {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = timestamp;
      this.xPrev = value;
      return value;
    }
    const dt = Math.max(timestamp - this.tPrev, 1 / this.freq);
    this.freq = 1 / dt;
    const dx = (value - this.xPrev) / dt;
    const edx = this.alpha(this.dCutoff) * dx + (1 - this.alpha(this.dCutoff)) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const result = this.alpha(cutoff) * value + (1 - this.alpha(cutoff)) * this.xPrev;
    this.xPrev = result;
    this.dxPrev = edx;
    this.tPrev = timestamp;
    return result;
  }
};
var JOINT_KEYS = [
  "nose",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle"
];
function smoothLandmarkTimeline(timeline, fps) {
  const filters = /* @__PURE__ */ new Map();
  for (const joint of JOINT_KEYS) {
    filters.set(joint, {
      fx: new OneEuroFilter(fps, 0.8, 0.02),
      fy: new OneEuroFilter(fps, 0.8, 0.02)
    });
  }
  return timeline.map((frame, i) => {
    const t = i / fps;
    const landmarks = { ...frame.landmarks };
    for (const joint of JOINT_KEYS) {
      const point = frame.landmarks[joint];
      if (!point || (point.visibility ?? 0) < 0.35) continue;
      const f = filters.get(joint);
      landmarks[joint] = {
        ...point,
        x: f.fx.filter(point.x, t),
        y: f.fy.filter(point.y, t)
      };
    }
    return { ...frame, landmarks };
  });
}

// lib/analysis/kickAnalysis.ts
var MIN_KNEE_VIS = 0.42;
var MIN_ANKLE_VIS = 0.4;
var MIN_HIP_VIS = 0.45;
var CHAMBER_LIFT_MIN = 0.012;
var EXTENSION_VELOCITY = 55e-4;
var MIN_CHAMBER_HEIGHT = 0.042;
var MIN_PIVOT_LATERAL = 0.02;
var MIN_HIP_ROT_ROUNDHOUSE = 26;
var EMPTY_KICK_STATE = {
  inChamber: false,
  inExtension: false,
  atPeak: false,
  kickingLeg: null
};
function legJoints(landmarks, side) {
  const hip = side === "left" ? landmarks.left_hip : landmarks.right_hip;
  const knee = side === "left" ? landmarks.left_knee : landmarks.right_knee;
  const ankle = side === "left" ? landmarks.left_ankle : landmarks.right_ankle;
  if (!hip || !knee || !ankle) return null;
  if ((hip.visibility ?? 0) < MIN_HIP_VIS || (knee.visibility ?? 0) < MIN_KNEE_VIS || (ankle.visibility ?? 0) < MIN_ANKLE_VIS) {
    return null;
  }
  return { hip, knee, ankle };
}
function plantedAnkle(landmarks, kickingSide) {
  const ankle = kickingSide === "left" ? landmarks.right_ankle : landmarks.left_ankle;
  if (!ankle || (ankle.visibility ?? 0) < MIN_ANKLE_VIS) return null;
  return ankle;
}
function kneeLift(hip, knee) {
  return hip.y - knee.y;
}
function legExtension(hip, ankle) {
  return Math.hypot(ankle.x - hip.x, ankle.y - hip.y);
}
function shinAngleFromHorizontal(knee, ankle) {
  return Math.atan2(
    Math.abs(ankle.y - knee.y),
    Math.abs(ankle.x - knee.x) + 1e-3
  ) * 180 / Math.PI;
}
function hipRotationDeg(landmarks) {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lh = landmarks.left_hip;
  const rh = landmarks.right_hip;
  if (!ls || !rs || !lh || !rh) return null;
  const shoulderAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);
  const hipAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x);
  return Math.abs((shoulderAngle - hipAngle) * 180 / Math.PI);
}
function footStrikeAtPeak(knee, ankle) {
  const ankleAboveKnee = ankle.y < knee.y - 0.022;
  const shinAngle = shinAngleFromHorizontal(knee, ankle);
  return ankleAboveKnee || shinAngle < 38;
}
function detectKicksForSide(timeline, side) {
  const events = [];
  const lifts = [];
  const extensions = [];
  const valid = [];
  for (const frame of timeline) {
    const joints = legJoints(frame.landmarks, side);
    if (!joints) {
      lifts.push(0);
      extensions.push(0);
      valid.push(false);
      continue;
    }
    lifts.push(kneeLift(joints.hip, joints.knee));
    extensions.push(legExtension(joints.hip, joints.ankle));
    valid.push(true);
  }
  let chamberStart = -1;
  let extensionStart = -1;
  let peakIdx = -1;
  let peakExt = 0;
  let maxChamber = 0;
  let extending = 0;
  const reset = () => {
    chamberStart = -1;
    extensionStart = -1;
    peakIdx = -1;
    peakExt = 0;
    maxChamber = 0;
    extending = 0;
  };
  const flush = (endIdx) => {
    if (peakIdx < 0 || chamberStart < 0 || extensionStart < 0) {
      reset();
      return;
    }
    if (peakIdx - chamberStart < 2) {
      reset();
      return;
    }
    const peakFrame = timeline[peakIdx];
    const chamberFrame = timeline[chamberStart];
    const joints = legJoints(peakFrame.landmarks, side);
    if (!joints) {
      reset();
      return;
    }
    const plantedStart = plantedAnkle(chamberFrame.landmarks, side);
    const plantedPeak = plantedAnkle(peakFrame.landmarks, side);
    const pivotLateral = plantedStart && plantedPeak ? Math.abs(plantedPeak.x - plantedStart.x) : 0;
    const hipRot = hipRotationDeg(peakFrame.landmarks);
    const chamberHeight = maxChamber;
    const footStrike = footStrikeAtPeak(joints.knee, joints.ankle);
    events.push({
      side,
      peakIdx,
      chamberStartIdx: chamberStart,
      extensionStartIdx: extensionStart,
      endIdx,
      start_timestamp: chamberFrame.timestamp,
      peak_timestamp: peakFrame.timestamp,
      end_timestamp: timeline[endIdx]?.timestamp ?? peakFrame.timestamp,
      hipRotationAtPeak: hipRot,
      plantedPivotLateral: pivotLateral,
      chamberHeight,
      footStrikeLikely: footStrike,
      lowChamber: chamberHeight < MIN_CHAMBER_HEIGHT,
      insufficientPivot: hipRot !== null && hipRot < MIN_HIP_ROT_ROUNDHOUSE || pivotLateral < MIN_PIVOT_LATERAL
    });
    reset();
  };
  for (let i = 1; i < timeline.length; i++) {
    if (!valid[i] || !valid[i - 1]) {
      if (peakIdx >= 0) flush(i - 1);
      else reset();
      continue;
    }
    const liftDelta = lifts[i] - lifts[i - 1];
    const extDelta = extensions[i] - extensions[i - 1];
    if (chamberStart < 0 && lifts[i] > CHAMBER_LIFT_MIN && liftDelta > 2e-3) {
      chamberStart = i;
      maxChamber = lifts[i];
    }
    if (chamberStart >= 0) {
      maxChamber = Math.max(maxChamber, lifts[i]);
      if (extensionStart < 0 && lifts[i] > CHAMBER_LIFT_MIN && extDelta > EXTENSION_VELOCITY) {
        extensionStart = i;
        extending = 1;
        peakIdx = i;
        peakExt = extensions[i];
      } else if (extensionStart >= 0) {
        if (extDelta > EXTENSION_VELOCITY * 0.35) {
          extending++;
        }
        if (extensions[i] > peakExt) {
          peakExt = extensions[i];
          peakIdx = i;
        }
        if (extDelta < -EXTENSION_VELOCITY * 0.45 && extending >= 2) {
          flush(i);
        }
      }
    }
  }
  if (peakIdx >= 0) {
    flush(timeline.length - 1);
  }
  return events;
}
function detectKickEvents(timeline) {
  if (timeline.length < 8) return [];
  const all = [
    ...detectKicksForSide(timeline, "left"),
    ...detectKicksForSide(timeline, "right")
  ].sort((a, b) => a.peakIdx - b.peakIdx);
  const merged = [];
  for (const event of all) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(event.peakIdx - last.peakIdx) < 6 && event.side === last.side) {
      continue;
    }
    merged.push(event);
  }
  return merged;
}
function buildKickFrameStates(timeline, events) {
  const states = timeline.map(() => ({ ...EMPTY_KICK_STATE }));
  for (const event of events) {
    for (let i = event.chamberStartIdx; i <= event.endIdx; i++) {
      if (!states[i]) continue;
      states[i].kickingLeg = event.side;
      if (i < event.extensionStartIdx) {
        states[i].inChamber = true;
      } else if (i < event.peakIdx) {
        states[i].inExtension = true;
      } else if (i <= event.peakIdx + 2) {
        states[i].atPeak = true;
        states[i].inExtension = true;
      }
    }
  }
  return states;
}

// lib/analysis/poseMetrics.ts
var MIN_JOINT_VISIBILITY = 0.5;
var MIN_WRIST_VISIBILITY = 0.45;
var MIN_HIP_VIS2 = 0.45;
var MIN_KNEE_VIS2 = 0.42;
var MIN_ANKLE_VIS2 = 0.4;
function jointVisible(point, min = MIN_JOINT_VISIBILITY) {
  return point !== void 0 && (point.visibility ?? 1) >= min;
}
function angleAtJoint(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAb = Math.hypot(ab.x, ab.y);
  const magCb = Math.hypot(cb.x, cb.y);
  if (magAb === 0 || magCb === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (magAb * magCb)));
  return Math.acos(cos) * 180 / Math.PI;
}
function getGuardLineY(landmarks) {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const nose = landmarks.nose;
  if (!ls || !rs) return null;
  const shoulderMid = (ls.y + rs.y) / 2;
  if (nose && jointVisible(nose, 0.35)) {
    return shoulderMid * 0.65 + nose.y * 0.35;
  }
  return shoulderMid;
}
var DEFAULT_GUARD_THRESHOLD = 0.018;
function calibrateGuardFromTimeline(timeline) {
  if (timeline.length < 6) return null;
  const sampleEnd = Math.min(
    timeline.length - 1,
    Math.max(8, Math.floor(timeline.length * 0.25))
  );
  const neutralYs = [];
  const wristDrops = [];
  for (let i = 0; i <= sampleEnd; i++) {
    const lm = timeline[i].landmarks;
    const guardY = getGuardLineY(lm);
    const lw = lm.left_wrist;
    const rw = lm.right_wrist;
    if (guardY === null || !lw || !rw) continue;
    if (!jointVisible(lw, MIN_WRIST_VISIBILITY) || !jointVisible(rw, MIN_WRIST_VISIBILITY)) {
      continue;
    }
    const leftAbove = lw.y < guardY + 0.01;
    const rightAbove = rw.y < guardY + 0.01;
    if (leftAbove && rightAbove) {
      neutralYs.push(guardY);
      wristDrops.push(
        Math.max(guardY - lw.y, guardY - rw.y)
      );
    }
  }
  if (neutralYs.length < 3) return null;
  const guardLineY = neutralYs.reduce((a, b) => a + b, 0) / neutralYs.length;
  const avgClearance = wristDrops.reduce((a, b) => a + b, 0) / wristDrops.length;
  const guardThreshold = Math.max(
    DEFAULT_GUARD_THRESHOLD,
    Math.min(0.035, avgClearance * 0.45)
  );
  return { guardLineY, guardThreshold };
}
function computeFrameMetrics(landmarks, calibration) {
  const lw = landmarks.left_wrist;
  const rw = landmarks.right_wrist;
  const nose = landmarks.nose;
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lh = landmarks.left_hip;
  const rh = landmarks.right_hip;
  const shouldersOk = jointVisible(ls) && jointVisible(rs);
  const leftWristOk = jointVisible(lw, MIN_WRIST_VISIBILITY);
  const rightWristOk = jointVisible(rw, MIN_WRIST_VISIBILITY);
  const metrics_reliable = shouldersOk && (leftWristOk || rightWristOk);
  const guardY = calibration?.guardLineY ?? getGuardLineY(landmarks);
  const threshold = calibration?.guardThreshold ?? DEFAULT_GUARD_THRESHOLD;
  const leftDown = guardY !== null && leftWristOk && lw ? lw.y > guardY + threshold : false;
  const rightDown = guardY !== null && rightWristOk && rw ? rw.y > guardY + threshold : false;
  let guard_confidence = 0;
  if (metrics_reliable && guardY !== null) {
    const vis = ((lw?.visibility ?? 0) + (rw?.visibility ?? 0) + (ls?.visibility ?? 0) + (rs?.visibility ?? 0)) / 4;
    guard_confidence = Math.min(1, vis * (leftWristOk && rightWristOk ? 1 : 0.82));
  }
  let hipRotation = null;
  if (shouldersOk && jointVisible(lh) && jointVisible(rh) && ls && rs && lh && rh) {
    const shoulderAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x);
    const hipAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x);
    hipRotation = Math.abs((shoulderAngle - hipAngle) * 180 / Math.PI);
  }
  let chinElevated = false;
  if (nose && ls && rs && jointVisible(nose, 0.4)) {
    const shoulderY = (ls.y + rs.y) / 2;
    chinElevated = nose.y < shoulderY - 0.06;
  }
  const leftElbow = ls && landmarks.left_elbow && lw && jointVisible(landmarks.left_elbow) ? angleAtJoint(ls, landmarks.left_elbow, lw) : null;
  const rightElbow = rs && landmarks.right_elbow && rw && jointVisible(landmarks.right_elbow) ? angleAtJoint(rs, landmarks.right_elbow, rw) : null;
  const guard_dropped = metrics_reliable && (leftDown || rightDown) && guard_confidence >= 0.42;
  const lk = landmarks.left_knee;
  const rk = landmarks.right_knee;
  const la = landmarks.left_ankle;
  const ra = landmarks.right_ankle;
  const leftLegOk = jointVisible(lh, MIN_HIP_VIS2) && jointVisible(lk, MIN_KNEE_VIS2) && jointVisible(la, MIN_ANKLE_VIS2);
  const rightLegOk = jointVisible(rh, MIN_HIP_VIS2) && jointVisible(rk, MIN_KNEE_VIS2) && jointVisible(ra, MIN_ANKLE_VIS2);
  const leg_metrics_reliable = leftLegOk || rightLegOk;
  const shinAngle = (knee, ankle) => Math.atan2(
    Math.abs(ankle.y - knee.y),
    Math.abs(ankle.x - knee.x) + 1e-3
  ) * 180 / Math.PI;
  const leftKneeLift = lh && lk && leftLegOk ? lh.y - lk.y : null;
  const rightKneeLift = rh && rk && rightLegOk ? rh.y - rk.y : null;
  const leftShin = lk && la && leftLegOk ? shinAngle(lk, la) : null;
  const rightShin = rk && ra && rightLegOk ? shinAngle(rk, ra) : null;
  return {
    guard_dropped,
    left_elbow_angle: leftElbow,
    right_elbow_angle: rightElbow,
    hip_rotation_deg: hipRotation,
    chin_elevated: chinElevated,
    left_wrist_below_guard: leftDown,
    right_wrist_below_guard: rightDown,
    guard_confidence,
    metrics_reliable,
    leg_metrics_reliable,
    left_knee_lift: leftKneeLift,
    right_knee_lift: rightKneeLift,
    left_shin_angle: leftShin,
    right_shin_angle: rightShin
  };
}

// lib/analysis/timelineAnalysis.ts
var EXTENSION_VELOCITY2 = 7e-3;
var RECOVERY_FRAMES = 14;
function wristShoulderDist(wx, wy, sx, sy) {
  return Math.hypot(wx - sx, wy - sy);
}
function markExtensionWindows(timeline, side) {
  const windows = /* @__PURE__ */ new Set();
  const dists = [];
  for (const frame of timeline) {
    const ls = frame.landmarks.left_shoulder;
    const rs = frame.landmarks.right_shoulder;
    const lw = frame.landmarks.left_wrist;
    const rw = frame.landmarks.right_wrist;
    if (!ls || !rs || !lw || !rw) {
      dists.push(0);
      continue;
    }
    const isRear = side === "rear";
    const sx = isRear ? rs.x : ls.x;
    const sy = isRear ? rs.y : ls.y;
    const wx = isRear ? rw.x : lw.x;
    const wy = isRear ? rw.y : lw.y;
    const vis = isRear ? rw.visibility ?? 0 : lw.visibility ?? 0;
    dists.push(vis >= 0.4 ? wristShoulderDist(wx, wy, sx, sy) : 0);
  }
  let extending = 0;
  let peakIdx = -1;
  let peakDist = 0;
  for (let i = 1; i < dists.length; i++) {
    const delta = dists[i] - dists[i - 1];
    if (dists[i] > 0.06 && delta > EXTENSION_VELOCITY2) {
      extending++;
      if (dists[i] > peakDist) {
        peakDist = dists[i];
        peakIdx = i;
      }
    } else if (extending >= 2 && peakIdx >= 0 && delta < -EXTENSION_VELOCITY2 * 0.5) {
      for (let j = peakIdx; j <= Math.min(peakIdx + RECOVERY_FRAMES, dists.length - 1); j++) {
        windows.add(j);
      }
      extending = 0;
      peakIdx = -1;
      peakDist = 0;
    } else if (delta <= 0) {
      extending = Math.max(0, extending - 1);
    }
  }
  return windows;
}
function buildTimelineContext(timeline) {
  const calibration = calibrateGuardFromTimeline(timeline);
  const postRear = markExtensionWindows(timeline, "rear");
  const postLead = markExtensionWindows(timeline, "lead");
  const kickEvents = detectKickEvents(timeline);
  const kickStates = buildKickFrameStates(timeline, kickEvents);
  const frames = timeline.map((frame, index) => ({
    frame: frame.frame,
    timestamp: frame.timestamp,
    timeSeconds: parseTimestamp(frame.timestamp),
    metrics: computeFrameMetrics(frame.landmarks, calibration),
    postRearExtension: postRear.has(index),
    postLeadExtension: postLead.has(index),
    kick: kickStates[index] ?? {
      inChamber: false,
      inExtension: false,
      atPeak: false,
      kickingLeg: null
    }
  }));
  return { calibration, frames, kickEvents };
}

// lib/analysis/mediaPipeServerRuntime.ts
var import_fs2 = require("fs");
var import_path2 = require("path");
var import_url = require("url");
var import_vm = __toESM(require("vm"));
function nodeRequire() {
  if (typeof __non_webpack_require__ !== "undefined") {
    return __non_webpack_require__;
  }
  return eval("require");
}
var patched = false;
function isNodeRuntime() {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}
function feedbackRoots() {
  const cwd = process.cwd();
  const roots2 = [cwd];
  if (!cwd.endsWith("feedback")) {
    roots2.push((0, import_path2.join)(cwd, "feedback"));
  }
  return roots2;
}
function packageRoot() {
  for (const root of feedbackRoots()) {
    const candidate = (0, import_path2.join)(root, "node_modules", "@mediapipe", "tasks-vision");
    if ((0, import_fs2.existsSync)((0, import_path2.join)(candidate, "wasm", "vision_wasm_internal.js"))) {
      return candidate;
    }
  }
  return (0, import_path2.join)(process.cwd(), "node_modules", "@mediapipe", "tasks-vision");
}
function mockWebGlClass(name2) {
  if (name2 in globalThis) {
    return globalThis[name2];
  }
  const Mock = function MockWebGl() {
  };
  globalThis[name2] = Mock;
  return Mock;
}
function loadEmscriptenFactory(preferNosimd = false) {
  const file = preferNosimd ? "vision_wasm_nosimd_internal.js" : "vision_wasm_internal.js";
  const jsPath = (0, import_path2.join)(packageRoot(), "wasm", file);
  const code = (0, import_fs2.readFileSync)(jsPath, "utf8");
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: nodeRequire(),
    process,
    __dirname: (0, import_path2.dirname)(jsPath),
    __filename: jsPath,
    global: globalThis,
    self: globalThis,
    console,
    setTimeout,
    clearTimeout,
    TextDecoder: globalThis.TextDecoder,
    TextEncoder: globalThis.TextEncoder,
    WebAssembly: globalThis.WebAssembly,
    performance: globalThis.performance,
    URL: globalThis.URL,
    Buffer: globalThis.Buffer,
    WebGLRenderingContext: mockWebGlClass("WebGLRenderingContext"),
    WebGL2RenderingContext: mockWebGlClass("WebGL2RenderingContext"),
    HTMLCanvasElement: mockWebGlClass("HTMLCanvasElement"),
    HTMLVideoElement: mockWebGlClass("HTMLVideoElement")
  };
  sandbox.exports = sandbox.module.exports;
  import_vm.default.createContext(sandbox);
  import_vm.default.runInContext(code, sandbox, { filename: jsPath });
  const mod = sandbox.module;
  const factory = mod.exports?.default ?? mod.exports;
  if (typeof factory !== "function") {
    throw new Error("MediaPipe WASM factory failed to load");
  }
  return factory;
}
function installDocumentPolyfill() {
  if (typeof globalThis.document !== "undefined") return;
  const WebGLCtx = mockWebGlClass("WebGLRenderingContext");
  const WebGL2Ctx = mockWebGlClass("WebGL2RenderingContext");
  function createMockGlContext(preferWebGl2 = false) {
    const ret0 = () => 0;
    const retNull = () => null;
    const retFalse = () => false;
    const retEmpty = () => [];
    const ctx = Object.create(
      (preferWebGl2 ? WebGL2Ctx : WebGLCtx).prototype
    );
    const methods = [
      "activeTexture",
      "attachShader",
      "bindAttribLocation",
      "bindBuffer",
      "bindFramebuffer",
      "bindRenderbuffer",
      "bindTexture",
      "blendColor",
      "blendEquation",
      "blendEquationSeparate",
      "blendFunc",
      "blendFuncSeparate",
      "bufferData",
      "bufferSubData",
      "checkFramebufferStatus",
      "clear",
      "clearColor",
      "clearDepth",
      "clearStencil",
      "colorMask",
      "compileShader",
      "copyTexImage2D",
      "copyTexSubImage2D",
      "createBuffer",
      "createFramebuffer",
      "createProgram",
      "createRenderbuffer",
      "createShader",
      "createTexture",
      "cullFace",
      "deleteBuffer",
      "deleteFramebuffer",
      "deleteProgram",
      "deleteRenderbuffer",
      "deleteShader",
      "deleteTexture",
      "depthFunc",
      "depthMask",
      "depthRange",
      "detachShader",
      "disable",
      "disableVertexAttribArray",
      "drawArrays",
      "drawElements",
      "enable",
      "enableVertexAttribArray",
      "finish",
      "flush",
      "framebufferRenderbuffer",
      "framebufferTexture2D",
      "frontFace",
      "generateMipmap",
      "getActiveAttrib",
      "getActiveUniform",
      "getAttachedShaders",
      "getAttribLocation",
      "getBufferParameter",
      "getError",
      "getFramebufferAttachmentParameter",
      "getProgramInfoLog",
      "getProgramParameter",
      "getRenderbufferParameter",
      "getShaderInfoLog",
      "getShaderParameter",
      "getShaderPrecisionFormat",
      "getShaderSource",
      "getTexParameter",
      "getUniform",
      "getUniformLocation",
      "getVertexAttrib",
      "getVertexAttribOffset",
      "hint",
      "isBuffer",
      "isEnabled",
      "isFramebuffer",
      "isProgram",
      "isRenderbuffer",
      "isShader",
      "isTexture",
      "lineWidth",
      "linkProgram",
      "pixelStorei",
      "polygonOffset",
      "readPixels",
      "renderbufferStorage",
      "sampleCoverage",
      "scissor",
      "shaderSource",
      "stencilFunc",
      "stencilFuncSeparate",
      "stencilMask",
      "stencilMaskSeparate",
      "stencilOp",
      "stencilOpSeparate",
      "texImage2D",
      "texParameterf",
      "texParameteri",
      "texSubImage2D",
      "uniform1f",
      "uniform1fv",
      "uniform1i",
      "uniform1iv",
      "uniform2f",
      "uniform2fv",
      "uniform2i",
      "uniform2iv",
      "uniform3f",
      "uniform3fv",
      "uniform3i",
      "uniform3iv",
      "uniform4f",
      "uniform4fv",
      "uniform4i",
      "uniform4iv",
      "uniformMatrix2fv",
      "uniformMatrix3fv",
      "uniformMatrix4fv",
      "useProgram",
      "validateProgram",
      "vertexAttrib1f",
      "vertexAttrib1fv",
      "vertexAttrib2f",
      "vertexAttrib2fv",
      "vertexAttrib3f",
      "vertexAttrib3fv",
      "vertexAttrib4f",
      "vertexAttrib4fv",
      "vertexAttribPointer",
      "viewport"
    ];
    for (const name2 of methods) {
      ctx[name2] = name2.startsWith("is") || name2 === "validateProgram" ? retFalse : ret0;
    }
    ctx.getExtension = retNull;
    ctx.getSupportedExtensions = retEmpty;
    ctx.getContextAttributes = () => ({
      alpha: true,
      antialias: true,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference: "default",
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false
    });
    ctx.getParameter = (p2) => p2 === 34921 ? 16 : 0;
    ctx.getShaderParameter = () => true;
    ctx.getProgramParameter = () => true;
    ctx.checkFramebufferStatus = () => 36053;
    ctx.getError = ret0;
    return ctx;
  }
  globalThis.document = {
    createElement(tag) {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          style: {},
          getContext(type) {
            if (type === "webgl2") return createMockGlContext(true);
            if (type === "webgl" || type === "experimental-webgl") {
              return createMockGlContext(false);
            }
            return null;
          }
        };
      }
      if (tag === "div") return { style: {} };
      if (tag !== "script") return {};
      const el = {
        crossOrigin: "",
        _listeners: {},
        _url: "",
        addEventListener(event, cb) {
          (el._listeners[event] ??= []).push(cb);
        }
      };
      Object.defineProperty(el, "src", {
        configurable: true,
        enumerable: true,
        get() {
          return el._url;
        },
        set(url) {
          el._url = url;
        }
      });
      return el;
    },
    body: {
      appendChild(el) {
        el._listeners.load?.forEach((cb) => cb());
        return el;
      }
    }
  };
}
function ensureMediaPipeServerRuntime() {
  if (!isNodeRuntime()) return;
  if (!patched) {
    patched = true;
    if (typeof globalThis.self === "undefined") {
      globalThis.self = globalThis;
    }
    installDocumentPolyfill();
    mockWebGlClass("WebGLRenderingContext");
    mockWebGlClass("WebGL2RenderingContext");
    mockWebGlClass("HTMLCanvasElement");
    mockWebGlClass("HTMLVideoElement");
  }
  if (typeof globalThis.ModuleFactory !== "function") {
    globalThis.ModuleFactory = loadEmscriptenFactory(false);
  }
}
function getMediaPipeVisionWasmBaseUrl() {
  if (!isNodeRuntime()) {
    return "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
  }
  ensureMediaPipeServerRuntime();
  return (0, import_url.pathToFileURL)((0, import_path2.join)(packageRoot(), "wasm")).href;
}

// lib/analysis/poseQuality.ts
var CORE_JOINTS = [
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip"
];
function assessPoseQuality(timeline) {
  if (timeline.length === 0) {
    return {
      score: 0,
      frames_total: 0,
      frames_with_pose: 0,
      avg_visibility: 0,
      usable: false,
      message: "No pose data extracted \u2014 try a clearer angle with full body visible."
    };
  }
  let framesWithPose = 0;
  let visibilitySum = 0;
  let visibilityCount = 0;
  for (const frame of timeline) {
    const coreVisible = CORE_JOINTS.filter(
      (j) => (frame.landmarks[j]?.visibility ?? 0) >= 0.5
    ).length;
    if (coreVisible >= 3) framesWithPose++;
    for (const joint of CORE_JOINTS) {
      const v = frame.landmarks[joint]?.visibility;
      if (v !== void 0) {
        visibilitySum += v;
        visibilityCount++;
      }
    }
  }
  const poseRatio = framesWithPose / timeline.length;
  const avgVisibility = visibilityCount > 0 ? visibilitySum / visibilityCount : 0;
  const score = Math.round((poseRatio * 0.7 + avgVisibility * 0.3) * 100);
  const usable = score >= 45 && framesWithPose >= 3;
  let message = "Movement tracking quality good.";
  if (score < 45) {
    message = "Limited movement tracking \u2014 use front/side angle, single athlete, full body in frame.";
  } else if (score < 70) {
    message = "Moderate movement tracking \u2014 overlays may be approximate in some frames.";
  }
  return {
    score,
    frames_total: timeline.length,
    frames_with_pose: framesWithPose,
    avg_visibility: Math.round(avgVisibility * 100) / 100,
    usable,
    message
  };
}

// config/sports.ts
var SPORTS = {
  boxing: {
    name: "Boxing",
    emoji: "\u{1F94A}",
    available: true,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24],
    mechanics_standards: {
      jab: {
        elbow_extension: { min: 165, max: 180 },
        shoulder_elevation: "required",
        return_frames: { max: 10 }
      },
      cross: {
        hip_rotation: { min: 45 },
        weight_shift: { min: 55, max: 65 },
        elbow_position: "tucked"
      },
      guard: {
        wrist_height: "above_shoulder",
        elbow_position: "protecting_ribs"
      }
    },
    common_weaknesses: [
      "elbow_flare_on_cross",
      "guard_drop_after_cross",
      "no_head_movement",
      "overcommitting_weight",
      "slow_guard_return",
      "chin_up",
      "square_stance"
    ],
    coach_voice: "corner_coach",
    elite_references: [
      "Canelo cross mechanics",
      "Lomachenko footwork",
      "Tyson Fury head movement",
      "Floyd Mayweather guard"
    ]
  },
  muaythai: {
    name: "Muay Thai",
    emoji: "\u{1F1F9}\u{1F1ED}",
    available: true,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      teep: {
        chamber_height: "hip_level_minimum",
        extension: "full",
        guard: "maintained_throughout"
      },
      roundhouse: {
        pivot: "required",
        hip_rotation: { min: 90 },
        shin_not_foot: "required"
      },
      knee: {
        chamber: "hip_height",
        clinch_guard: "maintained"
      }
    },
    common_weaknesses: [
      "dropping_guard_on_kick",
      "no_pivot_on_roundhouse",
      "kicking_with_foot_not_shin",
      "no_chamber_on_knee",
      "square_stance",
      "chin_up_in_clinch"
    ],
    coach_voice: "muay_thai_kru",
    elite_references: [
      "Buakaw roundhouse mechanics",
      "Saenchai teep technique",
      "Rodtang aggressive pressure"
    ]
  },
  mma: {
    name: "MMA",
    emoji: "\u{1F94B}",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      jab: { elbow_extension: { min: 160, max: 180 } },
      takedown_entry: { level_change: "required", head_position: "outside" },
      guard: { wrist_height: "above_shoulder" }
    },
    common_weaknesses: [
      "dropping_hands_on_kick",
      "telegraphed_takedown",
      "square_stance",
      "chin_up"
    ],
    coach_voice: "mma_coach",
    elite_references: ["Khabib chain wrestling", "Adesanya distance management"]
  },
  golf: {
    name: "Golf",
    emoji: "\u26F3",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26],
    mechanics_standards: {
      backswing: {
        shoulder_rotation: { min: 90 },
        hip_rotation: { min: 45 },
        left_arm: "straight"
      },
      downswing: {
        hip_leads_shoulder: "required",
        weight_transfer: "right_to_left"
      },
      follow_through: {
        full_rotation: "required",
        balance: "maintained"
      }
    },
    common_weaknesses: [
      "over_the_top_swing",
      "early_extension",
      "reverse_pivot",
      "casting",
      "chicken_wing_followthrough",
      "sway_not_rotate"
    ],
    coach_voice: "golf_pro",
    elite_references: [
      "Rory McIlroy hip rotation",
      "Tiger Woods impact position",
      "Ben Hogan swing plane"
    ]
  },
  tennis: {
    name: "Tennis",
    emoji: "\u{1F3BE}",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      serve: {
        trophy_position: "required",
        ball_toss: "consistent_height",
        leg_drive: "required"
      },
      forehand: {
        unit_turn: "required",
        wrist_lag: "maintained",
        follow_through: "over_shoulder"
      }
    },
    common_weaknesses: [
      "no_unit_turn",
      "arm_only_swing",
      "late_preparation",
      "no_leg_drive_on_serve",
      "inconsistent_toss"
    ],
    coach_voice: "tennis_coach",
    elite_references: [
      "Federer forehand mechanics",
      "Serena Williams serve",
      "Nadal topspin mechanics"
    ]
  },
  cricket: {
    name: "Cricket",
    emoji: "\u{1F3CF}",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      bowling_action: { front_arm_brace: "required", hip_drive: "required" },
      batting_stance: { head_still: "required", weight_transfer: "front_foot" }
    },
    common_weaknesses: [
      "no_front_arm_brace",
      "chucking_action",
      "head_fall_away_batting",
      "flat_foot_drive"
    ],
    coach_voice: "cricket_coach",
    elite_references: ["McGrath seam position", "Kohli cover drive"]
  },
  football: {
    name: "Football",
    emoji: "\u26BD",
    available: false,
    landmarks_to_track: [0, 11, 12, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      shooting: { plant_foot: "beside_ball", hip_rotation: { min: 40 } },
      sprint: { knee_drive: "high", arm_opposition: "required" }
    },
    common_weaknesses: [
      "leaning_back_on_shot",
      "no_hip_rotation",
      "flat_foot_strike"
    ],
    coach_voice: "football_coach",
    elite_references: ["Ronaldo knuckleball", "Haaland finishing mechanics"]
  },
  weightlifting: {
    name: "Weightlifting",
    emoji: "\u{1F3CB}\uFE0F",
    available: false,
    landmarks_to_track: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
    mechanics_standards: {
      squat: {
        depth: "hip_below_knee",
        knee_tracking: "over_toes",
        torso_angle: "maintained"
      },
      deadlift: {
        hip_hinge: "required",
        bar_path: "vertical",
        neutral_spine: "required"
      }
    },
    common_weaknesses: [
      "butt_wink",
      "knee_cave",
      "rounded_back_deadlift",
      "bar_drift_forward"
    ],
    coach_voice: "strength_coach",
    elite_references: ["Lu Xiaojun squat depth", "Pyrros Dimas pull technique"]
  }
};
function getSportConfig(sport) {
  return SPORTS[sport];
}

// lib/pose/mediapipeConfig.ts
var POSE_LANDMARKER_LITE_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
var POSE_SPORTS_DETECTION_CONFIDENCE = 0.5;
var POSE_SPORTS_TRACKING_CONFIDENCE = 0.5;
var POSE_SPORTS_PRESENCE_CONFIDENCE = 0.5;
var POSE_OCCLUSION_WRIST_VISIBILITY = 0.5;
var POSE_INTERPOLATED_VISIBILITY = 0.68;
var POSE_PIPELINE_MIN_VISIBILITY = 0.12;
var POSE_LANDMARK_MAP = {
  0: "nose",
  1: "left_eye_inner",
  2: "left_eye",
  3: "left_eye_outer",
  4: "right_eye_inner",
  5: "right_eye",
  6: "right_eye_outer",
  7: "left_ear",
  8: "right_ear",
  9: "mouth_left",
  10: "mouth_right",
  11: "left_shoulder",
  12: "right_shoulder",
  13: "left_elbow",
  14: "right_elbow",
  15: "left_wrist",
  16: "right_wrist",
  17: "left_pinky",
  18: "right_pinky",
  19: "left_index",
  20: "right_index",
  21: "left_thumb",
  22: "right_thumb",
  23: "left_hip",
  24: "right_hip",
  25: "left_knee",
  26: "right_knee",
  27: "left_ankle",
  28: "right_ankle",
  29: "left_heel",
  30: "right_heel",
  31: "left_foot_index",
  32: "right_foot_index"
};
var POSE_JOINT_KEYS = Object.values(POSE_LANDMARK_MAP);
function createSportsPoseLandmarkerOptions(runningMode, delegate = "GPU") {
  return {
    baseOptions: {
      modelAssetPath: POSE_LANDMARKER_LITE_URL,
      delegate
    },
    runningMode,
    numPoses: 1,
    minPoseDetectionConfidence: POSE_SPORTS_DETECTION_CONFIDENCE,
    minPosePresenceConfidence: POSE_SPORTS_PRESENCE_CONFIDENCE,
    minTrackingConfidence: POSE_SPORTS_TRACKING_CONFIDENCE,
    outputSegmentationMasks: false
  };
}

// lib/pose/mediapipePose.ts
function cloneLandmarks(landmarks) {
  const next = {};
  for (const key of POSE_JOINT_KEYS) {
    const point = landmarks[key];
    if (point) {
      next[key] = { ...point };
    }
  }
  return next;
}
function mapRawMediaPipePose(pose) {
  const landmarks = {};
  for (const [idxStr, key] of Object.entries(POSE_LANDMARK_MAP)) {
    const idx = Number(idxStr);
    const point = pose[idx];
    if (!point) continue;
    const visibility = point.visibility ?? 1;
    if (visibility < POSE_PIPELINE_MIN_VISIBILITY) continue;
    landmarks[key] = {
      x: point.x,
      y: point.y,
      z: point.z,
      visibility
    };
  }
  return landmarks;
}
function applySideViewZCorrection(landmarks) {
  const ls = landmarks.left_shoulder;
  const rs = landmarks.right_shoulder;
  const lh = landmarks.left_hip;
  const rh = landmarks.right_hip;
  if (!ls || !rs || !lh || !rh) return landmarks;
  const shoulderSpanX = Math.abs(ls.x - rs.x);
  const shoulderSpanZ = Math.abs((ls.z ?? 0) - (rs.z ?? 0));
  const torsoHeight = Math.abs((ls.y + rs.y) / 2 - (lh.y + rh.y) / 2);
  const profileRatio = shoulderSpanX / Math.max(torsoHeight, 0.08);
  const isSideView = profileRatio < 0.42 || shoulderSpanZ > shoulderSpanX * 0.75;
  if (!isSideView) return landmarks;
  const corrected = cloneLandmarks(landmarks);
  const coreZ = [];
  for (const key of ["left_shoulder", "right_shoulder", "left_hip", "right_hip"]) {
    const z = corrected[key]?.z;
    if (z !== void 0) coreZ.push(z);
  }
  if (coreZ.length === 0) return corrected;
  const torsoZ = coreZ.reduce((sum, z) => sum + z, 0) / coreZ.length;
  const zWeight = 0.22;
  for (const key of POSE_JOINT_KEYS) {
    const point = corrected[key];
    if (!point) continue;
    corrected[key] = {
      ...point,
      z: torsoZ * (1 - zWeight) + (point.z ?? torsoZ) * zWeight
    };
  }
  return corrected;
}
function interpolateWrist(landmarks, side, priorFrames) {
  const wristKey = `${side}_wrist`;
  const elbowKey = `${side}_elbow`;
  const shoulderKey = `${side}_shoulder`;
  const wrist = landmarks[wristKey];
  if ((wrist?.visibility ?? 1) >= POSE_OCCLUSION_WRIST_VISIBILITY) return;
  const elbow = landmarks[elbowKey];
  const shoulder = landmarks[shoulderKey];
  if (!elbow || !shoulder) return;
  const prev = priorFrames[priorFrames.length - 1];
  const prevWrist = prev?.[wristKey];
  const prevElbow = prev?.[elbowKey];
  if (prevWrist && prevElbow) {
    const vx = prevWrist.x - prevElbow.x;
    const vy = prevWrist.y - prevElbow.y;
    const vz = (prevWrist.z ?? 0) - (prevElbow.z ?? 0);
    landmarks[wristKey] = {
      x: elbow.x + vx,
      y: elbow.y + vy,
      z: (elbow.z ?? 0) + vz,
      visibility: POSE_INTERPOLATED_VISIBILITY
    };
    return;
  }
  const ux = elbow.x - shoulder.x;
  const uy = elbow.y - shoulder.y;
  const len = Math.hypot(ux, uy) || 0.01;
  const forearmLen = len * 0.88;
  landmarks[wristKey] = {
    x: elbow.x + ux / len * forearmLen,
    y: elbow.y + uy / len * forearmLen,
    z: elbow.z ?? shoulder.z,
    visibility: POSE_INTERPOLATED_VISIBILITY
  };
}
function interpolateOccludedWrists(landmarks, priorFrames) {
  const next = cloneLandmarks(landmarks);
  interpolateWrist(next, "left", priorFrames);
  interpolateWrist(next, "right", priorFrames);
  return next;
}
function averagePoint(points) {
  const n = points.length;
  return {
    x: points.reduce((sum, p2) => sum + p2.x, 0) / n,
    y: points.reduce((sum, p2) => sum + p2.y, 0) / n,
    z: points.reduce((sum, p2) => sum + (p2.z ?? 0), 0) / n,
    visibility: Math.max(...points.map((p2) => p2.visibility ?? 0))
  };
}
var LandmarkTripleSmoothBuffer = class {
  constructor() {
    this.frames = [];
  }
  reset() {
    this.frames = [];
  }
  get history() {
    return this.frames;
  }
  push(frame) {
    this.frames.push(cloneLandmarks(frame));
    if (this.frames.length > 3) {
      this.frames.shift();
    }
    return this.average();
  }
  average() {
    if (this.frames.length === 0) return {};
    if (this.frames.length === 1) return cloneLandmarks(this.frames[0]);
    const result = {};
    for (const key of POSE_JOINT_KEYS) {
      const points = this.frames.map((frame) => frame[key]).filter((point) => Boolean(point));
      if (points.length === 0) continue;
      result[key] = averagePoint(points);
    }
    return result;
  }
};
function hasCorePoseJoints(landmarks) {
  const core = [
    "left_shoulder",
    "right_shoulder",
    "left_hip",
    "right_hip"
  ];
  return core.filter((joint) => (landmarks[joint]?.visibility ?? 0) >= 0.35).length >= 3;
}
function processFightingPoseFrame(pose, smoothBuffer) {
  const raw = mapRawMediaPipePose(pose);
  if (!hasCorePoseJoints(raw)) return null;
  const sideAdjusted = applySideViewZCorrection(raw);
  const withWrists = interpolateOccludedWrists(
    sideAdjusted,
    smoothBuffer.history
  );
  return smoothBuffer.push(withWrists);
}

// lib/analysis/poseDetectionCore.ts
var landmarkerInstance = null;
async function getLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;
  ensureMediaPipeServerRuntime();
  const wasmBaseUrl = getMediaPipeVisionWasmBaseUrl();
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);
  landmarkerInstance = await PoseLandmarker.createFromOptions(
    vision,
    createSportsPoseLandmarkerOptions("IMAGE", "CPU")
  );
  return landmarkerInstance;
}
async function loadFrameImage(framePath) {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(framePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return canvas;
}
function mapPoseToLandmarks(pose, indices, smoothBuffer) {
  const processed = processFightingPoseFrame(pose, smoothBuffer);
  if (!processed) return {};
  const landmarks = {};
  for (const idx of indices) {
    const key = POSE_LANDMARK_MAP[idx];
    if (key && processed[key]) {
      landmarks[key] = processed[key];
    }
  }
  return landmarks;
}
function buildLandmarkSummary(timeline, sport) {
  const context = buildTimelineContext(timeline);
  const { calibration, frames } = context;
  const reliableFrames = frames.filter((f) => f.metrics.metrics_reliable);
  const guardDropFrames = reliableFrames.filter(
    (f) => f.metrics.guard_dropped
  ).length;
  const elbowAngles = reliableFrames.map((f) => f.metrics.right_elbow_angle).filter((a) => a !== null);
  const avgElbow = elbowAngles.length > 0 ? Math.round(
    elbowAngles.reduce((a, b) => a + b, 0) / elbowAngles.length
  ) : null;
  const avgGuardConfidence = reliableFrames.length > 0 ? Math.round(
    reliableFrames.reduce((s, f) => s + f.metrics.guard_confidence, 0) / reliableFrames.length * 100
  ) / 100 : null;
  return {
    sport,
    frames_analysed: timeline.length,
    reliable_frame_ratio: timeline.length ? Math.round(reliableFrames.length / timeline.length * 100) : 0,
    guard_drop_frame_ratio: reliableFrames.length ? Math.round(guardDropFrames / reliableFrames.length * 100) : 0,
    avg_right_elbow_angle: avgElbow,
    avg_guard_confidence: avgGuardConfidence,
    guard_calibrated: calibration !== null,
    guard_line_y: calibration?.guardLineY ?? null,
    guard_threshold: calibration?.guardThreshold ?? null,
    kick_events_detected: context.kickEvents.length,
    sample_timestamps: timeline.slice(0, 5).map((f) => f.timestamp)
  };
}
async function detectPoseWithMeta(framePaths, sport) {
  const sportConfig = getSportConfig(sport);
  const indices = sportConfig.landmarks_to_track;
  const rawTimeline = [];
  if (framePaths.length === 0) {
    const quality2 = assessPoseQuality([]);
    return {
      timeline: [],
      quality: quality2,
      confirmed_events: [],
      landmark_summary: { error: "no_frames" }
    };
  }
  const landmarker = await getLandmarker();
  const smoothBuffer = new LandmarkTripleSmoothBuffer();
  for (let i = 0; i < framePaths.length; i++) {
    try {
      const image = await loadFrameImage(framePaths[i]);
      const result = landmarker.detect(image);
      const pose = result.landmarks[0];
      const landmarks = pose ? mapPoseToLandmarks(pose, indices, smoothBuffer) : {};
      rawTimeline.push({
        frame: i,
        timestamp: frameToTimestamp(i),
        landmarks
      });
    } catch (error) {
      console.warn(`Pose detection failed for frame ${i}:`, error);
      rawTimeline.push({
        frame: i,
        timestamp: frameToTimestamp(i),
        landmarks: {}
      });
    }
  }
  const timeline = smoothLandmarkTimeline(rawTimeline, FRAMES_PER_SECOND);
  const quality = assessPoseQuality(timeline);
  const landmark_summary = buildLandmarkSummary(timeline, sport);
  return {
    timeline,
    quality,
    confirmed_events: [],
    landmark_summary
  };
}

// scripts/detect-pose-cli.ts
async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error("Usage: detect-pose-cli.ts <input.json> <output.json>");
    process.exit(1);
  }
  const input = JSON.parse(await (0, import_promises.readFile)(inputPath, "utf8"));
  const result = await detectPoseWithMeta(input.framePaths, input.sport);
  await (0, import_promises.writeFile)(outputPath, JSON.stringify(result));
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
