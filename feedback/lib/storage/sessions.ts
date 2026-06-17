import {
  FREE_ANALYSIS_LIMIT,
  PRO_MONTHLY_ANALYSIS_LIMIT,
} from "@/config/limits";
import { PRICING } from "@/config/pricing";
import { isAnalysisLimitBypassed, hasProAccess } from "@/lib/config/env";
import {
  createAnonymousUser,
  decrementBonusScans,
  getMonthlySessionCount,
  getUserById,
  incrementFreeAnalyses,
  createSession,
  getSessionById,
  getUserSessions,
} from "@/lib/db/queries";
import type { AnalysisAllowance, SkillLevel, SportId } from "@/types";

export async function ensureUser(
  sport: SportId,
  level: SkillLevel,
  storedUserId?: string | null
): Promise<string> {
  if (storedUserId) {
    const user = await getUserById(storedUserId);
    if (user) return user.id;
  }

  const user = await createAnonymousUser(sport, level);
  return user.id;
}

export async function getAnalysisAllowance(
  userId: string
): Promise<AnalysisAllowance> {
  if (isAnalysisLimitBypassed()) {
    return {
      canAnalyse: true,
      isPro: hasProAccess(null),
      used: 0,
      limit: FREE_ANALYSIS_LIMIT,
      bonusScans: 0,
      message: "",
    };
  }

  const user = await getUserById(userId);

  if (!user) {
    return {
      canAnalyse: true,
      isPro: hasProAccess(null),
      used: 0,
      limit: FREE_ANALYSIS_LIMIT,
      bonusScans: 0,
      message: "",
    };
  }

  if (user.is_pro) {
    const used = await getMonthlySessionCount(userId);
    const limit = PRO_MONTHLY_ANALYSIS_LIMIT;
    const bonusScans = user.bonus_scans;
    const canAnalyse = used < limit || bonusScans > 0;

    return {
      canAnalyse,
      isPro: true,
      used,
      limit,
      bonusScans,
      message: canAnalyse
        ? ""
        : `Monthly limit reached (${limit}). Buy ${PRICING.topUp.scans} more for ${PRICING.topUp.displayShort} or wait until the 1st.`,
    };
  }

  const used = user.free_analyses_used;
  const limit = user.free_analyses_limit;
  const canAnalyse = used < limit;

  return {
    canAnalyse,
    isPro: hasProAccess(user),
    used,
    limit,
    bonusScans: 0,
    message: canAnalyse
      ? ""
      : `Free analysis used. Upgrade to Pro (${PRICING.pro.displayMonthly}) for ${PRO_MONTHLY_ANALYSIS_LIMIT}/month.`,
  };
}

export async function canUserAnalyse(userId: string): Promise<boolean> {
  const allowance = await getAnalysisAllowance(userId);
  return allowance.canAnalyse;
}

export async function recordAnalysisUsed(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;

  if (!user.is_pro) {
    await incrementFreeAnalyses(userId);
    return;
  }

  const used = await getMonthlySessionCount(userId);
  if (used >= PRO_MONTHLY_ANALYSIS_LIMIT) {
    await decrementBonusScans(userId);
  }
}

export { createSession, getSessionById, getUserSessions };
