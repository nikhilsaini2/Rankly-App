import { useCallback, useState } from 'react';
import type { AtsScoreRow } from '../types/common.types';
import { generateGeminiText, parseGeminiJson } from '../services/gemini/gemini';
import { buildAtsScorePrompt } from '../services/gemini/prompts';
import { supabase } from '../services/supabase/supabase';

type GeminiAts = {
  overall_score: number;
  keyword_score?: number;
  format_score?: number;
  content_score?: number;
  readability_score?: number;
  keywords_found?: string[];
  keywords_missing?: string[];
  ai_summary?: string;
  feedback?: { strengths?: string[]; improvements?: string[] };
};

function mapDbToAts(r: Record<string, unknown>): AtsScoreRow {
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

function parseAtsResponse(raw: string): GeminiAts {
  try {
    return parseGeminiJson<GeminiAts>(raw);
  } catch {
    throw new Error('AI response was unclear. Please try again.');
  }
}

export function useAtsScore() {
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<AtsScoreRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scoreResume = useCallback(async (resumeId: string, jobDescription?: string) => {
    setScoring(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: res, error: rErr } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .single();
      if (rErr || !res) throw rErr ?? new Error('Resume not found');

      const body = (res.raw_text as string) || '';
      const fname = (res.file_name as string) || 'resume.pdf';

      const prompt = buildAtsScorePrompt(body, fname, jobDescription);
      const raw = await generateGeminiText(prompt);
      const parsed = parseAtsResponse(raw);

      const insert = {
        user_id: user.id,
        resume_id: resumeId,
        job_description: jobDescription ?? null,
        overall_score: Math.round(parsed.overall_score),
        keyword_score: Math.round(parsed.keyword_score ?? parsed.overall_score),
        format_score: Math.round(parsed.format_score ?? parsed.overall_score),
        content_score: Math.round(parsed.content_score ?? parsed.overall_score),
        readability_score: Math.round(parsed.readability_score ?? parsed.overall_score),
        feedback: parsed.feedback ?? { strengths: [], improvements: [] },
        keywords_found: parsed.keywords_found ?? [],
        keywords_missing: parsed.keywords_missing ?? [],
        ai_summary: parsed.ai_summary ?? '',
      };

      const { data: row, error: sErr } = await supabase
        .from('ats_scores')
        .insert(insert)
        .select()
        .single();
      if (sErr || !row) throw sErr ?? new Error('Could not save score');

      const mapped = mapDbToAts(row as Record<string, unknown>);
      setScore(mapped);
      return mapped;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI response was unclear. Please try again.';
      setError(msg);
      throw e;
    } finally {
      setScoring(false);
    }
  }, []);

  const getLatestScore = useCallback(async (resumeId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { data, error: qErr } = await supabase
      .from('ats_scores')
      .select('*')
      .eq('resume_id', resumeId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!data) return null;
    const mapped = mapDbToAts(data as Record<string, unknown>);
    setScore(mapped);
    return mapped;
  }, []);

  const getScoreById = useCallback(async (scoreId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { data, error: qErr } = await supabase
      .from('ats_scores')
      .select('*')
      .eq('id', scoreId)
      .eq('user_id', user.id)
      .single();
    if (qErr) throw qErr;
    if (!data) return null;
    return mapDbToAts(data as Record<string, unknown>);
  }, []);

  const getScoreHistory = useCallback(async (userId: string) => {
    const { data, error: qErr } = await supabase
      .from('ats_scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (qErr) throw qErr;
    return (data ?? []).map((r) => mapDbToAts(r as Record<string, unknown>));
  }, []);

  return { scoring, score, error, scoreResume, getLatestScore, getScoreById, getScoreHistory };
}
