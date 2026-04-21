import type { User } from "../../types/common.types";

export type PlanTier = User["plan"];

export type PlanLimits = {
  resumes: number | null;
};

export type PlanUsageSummary = {
  resumesUsed: number;
  resumesLimit: number | null;
  interviewsCompleted: number;
  credits: number;
  resumesRemainingLabel: string;
};

export type PlanFeatureRow = {
  id: string;
  label: string;
  free: string;
  pro: string;
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    resumes: 3,
  },
  pro: {
    resumes: null,
  },
};

export const PLAN_FEATURE_MATRIX: PlanFeatureRow[] = [
  {
    id: "resume_uploads",
    label: "Resume uploads",
    free: "Up to 3",
    pro: "Unlimited",
  },
  {
    id: "history",
    label: "Cloud history",
    free: "Interview + salary",
    pro: "Interview + salary + higher limits",
  },
  {
    id: "credits",
    label: "Credits tracking",
    free: "Visible",
    pro: "Visible",
  },
];

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function getResumeLimit(plan: PlanTier): number | null {
  return getPlanLimits(plan).resumes;
}

export function canUploadResume(plan: PlanTier, currentCount: number): boolean {
  const limit = getResumeLimit(plan);
  return limit === null || currentCount < limit;
}

export function getResumeRemainingLabel(
  plan: PlanTier,
  currentCount: number,
): string {
  const limit = getResumeLimit(plan);
  if (limit === null) return "Unlimited";

  const remaining = Math.max(limit - currentCount, 0);
  if (remaining === 1) return "1 slot left";
  return `${remaining} slots left`;
}

export function getPlanUsageSummary(params: {
  user: User;
  resumesUsed: number;
  interviewsCompleted: number;
}): PlanUsageSummary {
  const { user, resumesUsed, interviewsCompleted } = params;
  const resumesLimit = getResumeLimit(user.plan);

  return {
    resumesUsed,
    resumesLimit,
    interviewsCompleted,
    credits: user.credits ?? 0,
    resumesRemainingLabel: getResumeRemainingLabel(user.plan, resumesUsed),
  };
}
