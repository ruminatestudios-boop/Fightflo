import {
  FREE_ANALYSIS_LIMIT,
  PRO_MONTHLY_ANALYSIS_LIMIT,
} from "@/config/limits";
import { isAnalysisLimitBypassed } from "@/lib/config/env";
import {
  createAnonymousUser,
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
      isPro: false,
      used: 0,
      limit: FREE_ANALYSIS_LIMIT,
      message: "",
    };
  }

  const user = await getUserById(userId);

  if (!user) {
    return {
      canAnalyse: true,
      isPro: false,
      used: 0,
      limit: FREE_ANALYSIS_LIMIT,
      message: "",
    };
  }

  if (user.is_pro) {
    const used = await getMonthlySessionCount(userId);
    const limit = PRO_MONTHLY_ANALYSIS_LIMIT;
    const canAnalyse = used < limit;

    return {
      canAnalyse,
      isPro: true,
      used,
      limit,
      message: canAnalyse
        ? ""
        : `Pro limit reached (${limit}/month). Resets on the 1st.`,
    };
  }

  const used = user.free_analyses_used;
  const limit = user.free_analyses_limit;
  const canAnalyse = used < limit;

  return {
    canAnalyse,
    isPro: false,
    used,
    limit,
    message: canAnalyse
      ? ""
      : "Free analysis used. Upgrade to Pro for 15/month.",
  };
}

export async function canUserAnalyse(userId: string): Promise<boolean> {
  const allowance = await getAnalysisAllowance(userId);
  return allowance.canAnalyse;
}

export async function recordAnalysisUsed(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (user && !user.is_pro) {
    await incrementFreeAnalyses(userId);
  }
}

export { createSession, getSessionById, getUserSessions };
