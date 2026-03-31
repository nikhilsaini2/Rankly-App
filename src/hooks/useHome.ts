import { useEffect, useState } from "react";
import { supabase } from "../services/supabase/supabase";
import { AtsScoreRow } from "../types/common.types";
import { scoreTierColor, scoreTierLabel } from "../utils/score";

interface LatestScore {
  id: string;
  overall_score: number;
  resume_id: string;
  created_at: string;
}

interface HighestScore {
  id: string;
  overall_score: number;
  resume_id: string;
}

interface HomeStats {
  latestScore: LatestScore | null;
  highestScore: HighestScore | null;
  resumeCount: number;
  sessionCount: number;
}

export { scoreTierColor, scoreTierLabel };

function mapAtsRow(r: Record<string, unknown>): AtsScoreRow {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    resumeId: (r.resume_id as string) ?? null,
    overallScore: r.overall_score as number,
    keywordScore: (r.keyword_score as number) ?? null,
    formatScore: (r.format_score as number) ?? null,
    contentScore: (r.content_score as number) ?? null,
    readabilityScore: (r.readability_score as number) ?? null,
    feedback: (r.feedback as AtsScoreRow["feedback"]) ?? null,
    keywordsFound: (r.keywords_found as string[]) ?? null,
    keywordsMissing: (r.keywords_missing as string[]) ?? null,
    aiSummary: (r.ai_summary as string) ?? null,
    createdAt: r.created_at as string,
  };
}

export function useHome() {
  const [stats, setStats] = useState<HomeStats>({
    latestScore: null,
    highestScore: null,
    resumeCount: 0,
    sessionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const userId = user.id;

      // Run all queries in parallel
      const [
        resumesResult,
        latestScoreResult,
        highestScoreResult,
        resumeCountResult,
        sessionsResult,
      ] = await Promise.allSettled([
        supabase
          .from("resumes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        // Latest score (most recent)
        supabase
          .from("ats_scores")
          .select("id, overall_score, resume_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        // Highest score
        supabase
          .from("ats_scores")
          .select("id, overall_score, resume_id")
          .eq("user_id", userId)
          .order("overall_score", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("resumes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("interview_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("completed", true),
      ]);

      // Safely extract each result
      const resumeCount =
        resumeCountResult.status === "fulfilled" &&
        resumeCountResult.value?.count != null
          ? resumeCountResult.value.count
          : 0;

      const sessionCount =
        sessionsResult.status === "fulfilled" &&
        sessionsResult.value?.count != null
          ? sessionsResult.value.count
          : 0;

      const latestScore =
        latestScoreResult.status === "fulfilled" &&
        latestScoreResult.value &&
        "data" in latestScoreResult.value
          ? latestScoreResult.value.data
          : null;

      const highestScore =
        highestScoreResult.status === "fulfilled" &&
        highestScoreResult.value &&
        "data" in highestScoreResult.value
          ? highestScoreResult.value.data
          : null;

      const userResult = await supabase
        .from("users")
        .select("first_name")
        .eq("auth_id", user.id)
        .maybeSingle();

      const firstName =
        userResult && userResult.data && userResult.data.first_name
          ? userResult.data.first_name
          : "there";

      // Log any failures for debugging
      if (resumesResult.status === "rejected") {
        console.warn("[useHome] resumes query failed:", resumesResult.reason);
      }
      if (latestScoreResult.status === "rejected") {
        console.warn("[useHome] latestScore failed:", latestScoreResult.reason);
      }
      if (highestScoreResult.status === "rejected") {
        console.warn(
          "[useHome] highestScore failed:",
          highestScoreResult.reason,
        );
      }
      if (resumeCountResult.status === "rejected") {
        console.warn("[useHome] resumeCount failed:", resumeCountResult.reason);
      }
      if (sessionsResult.status === "rejected") {
        console.warn("[useHome] sessionCount failed:", sessionsResult.reason);
      }

      console.log("[useHome] Final stats:", {
        latestScore,
        highestScore,
        resumeCount,
        sessionCount,
      });

      setStats({ latestScore, highestScore, resumeCount, sessionCount });
      setFirstName(firstName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load home";
      console.error("[useHome]", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { ...stats, loading, error, firstName, refresh: load };
}
