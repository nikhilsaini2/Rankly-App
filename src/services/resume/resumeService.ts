import type { ResumeRow } from "../../types/common.types";
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

  if (!authUser) return { resumes: [], scores: {} };

  const { data: list } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });

  const { data: atsRows } = await supabase
    .from("ats_scores")
    .select("id, resume_id, overall_score, created_at")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });

  const scores: Record<string, ScoreInfo> = {};
  for (const r of atsRows ?? []) {
    const resumeId = (r.resume_id as string | null) ?? null;
    if (resumeId && scores[resumeId] === undefined) {
      scores[resumeId] = {
        score: r.overall_score as number,
        scoreId: r.id as string,
      };
    }
  }

  const resumes: ResumeRow[] = (list ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    fileUrl: r.file_url as string | null,
    fileName: r.file_name as string | null,
    rawText: r.raw_text as string | null,
    isPrimary: Boolean(r.is_primary),
    createdAt: r.created_at as string,
  }));

  return { resumes, scores };
}

