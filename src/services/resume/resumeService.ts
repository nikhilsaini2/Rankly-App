import type { AtsScoreSummary, ResumeRow } from "../../types/common.types";
import { supabase } from "../supabase/supabase";

export type ScoreInfo = { score: number; scoreId: string };

export type ResumeScreenData = {
  resumes: ResumeRow[];
  scores: Record<string, ScoreInfo>;
};

export async function fetchResumeScreenData(): Promise<ResumeScreenData> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { resumes: [], scores: {} };
  }

  // Query 1: fetch resumes (simple, no join)
  const { data: resumeData, error: resumeError } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });

  if (resumeError) {
    console.error(
      "[fetchResumeScreenData] resumes fetch failed:",
      resumeError.message,
    );
    throw new Error(resumeError.message);
  }

  if (!resumeData || resumeData.length === 0) {
    return { resumes: [], scores: {} };
  }

  // Query 2: fetch all scores for these resumes in one query
  const resumeIds = resumeData.map((r) => r.id);
  const { data: scoresData } = await supabase
    .from("ats_scores")
    .select("id, resume_id, overall_score, created_at")
    .in("resume_id", resumeIds)
    .order("created_at", { ascending: false });

  // Helper to get latest score from joined array
  function getLatestAtsScore(resume: ResumeRow): AtsScoreSummary | null {
    if (!resume.ats_scores || resume.ats_scores.length === 0) return null;
    return [...resume.ats_scores].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }

  // Merge scores into resumes manually
  const resumes: ResumeRow[] = resumeData.map((r) => {
    const scores = (scoresData ?? []).filter((s) => s.resume_id === r.id);
    return {
      id: r.id as string,
      userId: r.user_id as string,
      title: r.title as string,
      fileUrl: r.file_url as string | null,
      fileName: r.file_name as string | null,
      rawText: r.raw_text as string | null,
      latestScore: null, // Not using cache anymore
      latestScoreId: null, // Not using cache anymore
      isPrimary: Boolean(r.is_primary),
      createdAt: r.created_at as string,
      ats_scores: scores,
    };
  });

  const scores: Record<string, ScoreInfo> = {};

  for (const resume of resumes) {
    const latestScore = getLatestAtsScore(resume);
    if (latestScore) {
      scores[resume.id] = {
        score: latestScore.overall_score,
        scoreId: latestScore.id,
      };
    }
  }

  return { resumes, scores };
}
