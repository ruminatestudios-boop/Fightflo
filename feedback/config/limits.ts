/** Lifetime free analyses per account */
export const FREE_ANALYSIS_LIMIT = 1;

/** Pro fair-use cap — resets on the 1st of each month (UTC) */
export const PRO_MONTHLY_ANALYSIS_LIMIT = 15;

/** Daily upload cap for crew access links */
export const CREW_DAILY_LIMIT = 15;

export function startOfCurrentMonthUtc(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function startOfTodayUtc(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
