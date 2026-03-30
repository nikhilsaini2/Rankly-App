import { colors } from '../theme/color';

export type ScoreTier = 'excellent' | 'great' | 'good' | 'needs-work';

export function getScoreTier(score: number): ScoreTier {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'great';
  if (score >= 50) return 'good';
  return 'needs-work';
}

export function scoreTierLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Great';
  if (score >= 50) return 'Good';
  return 'Needs Work';
}

export function scoreTierColor(score: number): string {
  if (score >= 75) return colors.accent;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

/** For interview question scores (0–10 scale). */
export function getQuestionScoreColor(score: number): string {
  if (score >= 8) return colors.accent;
  if (score >= 5) return colors.warning;
  return colors.danger;
}

export function getInterviewResultMessage(score: number): string {
  if (score >= 80) return "Excellent performance! You're ready to interview.";
  if (score >= 60) return "Good effort! A bit more practice and you'll be ready.";
  if (score >= 40) return 'Keep practicing. Focus on the feedback below.';
  return "Don't give up! Review the tips and try again.";
}
