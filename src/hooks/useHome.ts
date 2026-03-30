import { useEffect, useState } from 'react';
import { AtsScoreRow } from '../types/common.types';
import { supabase } from '../services/supabase/supabase';
import { scoreTierLabel, scoreTierColor } from '../utils/score';

export { scoreTierLabel, scoreTierColor };

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
    feedback: (r.feedback as AtsScoreRow['feedback']) ?? null,
    keywordsFound: (r.keywords_found as string[]) ?? null,
    keywordsMissing: (r.keywords_missing as string[]) ?? null,
    aiSummary: (r.ai_summary as string) ?? null,
    createdAt: r.created_at as string,
  };
}

export function useHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [latestScore, setLatestScore] = useState<AtsScoreRow | null>(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [interviewsDone, setInterviewsDone] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !alive) return;

        const { data: urow } = await supabase
          .from('users')
          .select('first_name')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (alive) setFirstName((urow?.first_name as string) ?? 'there');

        const [resumesResult, scoresResult, sessionsResult] =
          await Promise.allSettled([
            supabase
              .from('resumes')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id),
            supabase
              .from('ats_scores')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('interview_sessions')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('completed', true),
          ]);

        if (!alive) return;

        if (scoresResult.status === 'fulfilled') {
          const fr = scoresResult.value;
          if (fr.data && !fr.error) {
            setLatestScore(mapAtsRow(fr.data as Record<string, unknown>));
          } else {
            setLatestScore(null);
          }
        } else {
          setLatestScore(null);
        }

        if (resumesResult.status === 'fulfilled' && resumesResult.value.count != null) {
          setResumeCount(resumesResult.value.count ?? 0);
        } else {
          setResumeCount(0);
        }

        if (sessionsResult.status === 'fulfilled' && sessionsResult.value.count != null) {
          setInterviewsDone(sessionsResult.value.count ?? 0);
        } else {
          setInterviewsDone(0);
        }
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Failed to load home');
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return {
    loading,
    error,
    firstName,
    latestScore,
    resumeCount,
    interviewsDone,
  };
}
