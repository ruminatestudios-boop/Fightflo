/** Bottom-left "FIGHTFLO." watermark — matches brand reference placement. */
export const WATERMARK_FILTER =
  "drawtext=text='FIGHTFLO.':fontcolor=white@0.92:fontsize=32:x=28:y=h-th-28:shadowcolor=black@0.55:shadowx=2:shadowy=2";

/** Free-tier exports get the watermark; Pro exports are clean. */
export function watermarkFilters(isPro: boolean): string[] {
  return isPro ? [] : [WATERMARK_FILTER];
}
