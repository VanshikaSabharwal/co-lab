import prisma from "./prisma";

// Free-tier limits, per member per group. Subscription tiers will override
// these numbers later (same keys, looked up from a subscription record).
export const FREE_LIMITS = {
  changeRequestsPerWeek: 5,
  commitsPerDay: 30,
};

export interface LimitCheck {
  ok: boolean;
  reason?: string;
  remaining?: number;
}

// A Ko-Lab "commit" is one CR (it batches many files), so both windows count
// ChangeRequest rows. Weekly gate is the binding one for the free tier.
export async function checkChangeRequestLimit(
  groupId: string,
  authorId: string,
): Promise<LimitCheck> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [weekCount, dayCount] = await Promise.all([
    prisma.changeRequest.count({
      where: { groupId, authorId, createdAt: { gte: weekAgo } },
    }),
    prisma.changeRequest.count({
      where: { groupId, authorId, createdAt: { gte: dayAgo } },
    }),
  ]);

  if (weekCount >= FREE_LIMITS.changeRequestsPerWeek) {
    return {
      ok: false,
      reason: `Free tier allows ${FREE_LIMITS.changeRequestsPerWeek} change requests per week. Try again later or upgrade.`,
      remaining: 0,
    };
  }
  if (dayCount >= FREE_LIMITS.commitsPerDay) {
    return {
      ok: false,
      reason: `Free tier allows ${FREE_LIMITS.commitsPerDay} commits per day.`,
      remaining: 0,
    };
  }

  return { ok: true, remaining: FREE_LIMITS.changeRequestsPerWeek - weekCount };
}
