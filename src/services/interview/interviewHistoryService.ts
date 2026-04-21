import { getAllInterviews, deleteInterview as deleteLocalInterview } from "../../feature/interview/services/interviewStorage";
import type {
  Answer,
  InterviewHistoryEntry,
} from "../../feature/interview/types/interview.types";
import { supabase } from "../supabase/supabase";

type InterviewSessionRow = {
  id: string;
  role: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  session_type: "behavioral" | "technical" | "mixed" | null;
  total_questions: number | null;
  score: number | null;
  created_at: string;
  completed_at: string | null;
};

type InterviewQuestionRow = {
  session_id: string;
  question_order: number | null;
  question: string | null;
  user_answer: string | null;
  ai_feedback: string | null;
  score: number | null;
};

function normalizeCloudAnswer(row: InterviewQuestionRow): Answer {
  return {
    question: row.question ?? "Interview question",
    transcript: row.user_answer?.trim() || "(No answer recorded)",
    overall: row.ai_feedback?.trim() || "AI feedback unavailable.",
    score: Math.max(0, Math.min(100, Math.round((row.score ?? 0) * 10))),
    strengths: [],
    improvements: [],
    tip: "",
  };
}

function mapCloudSession(
  row: InterviewSessionRow,
  questions: InterviewQuestionRow[],
): InterviewHistoryEntry {
  const orderedAnswers = questions
    .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
    .map(normalizeCloudAnswer);

  return {
    id: row.id,
    source: "cloud",
    role: row.role ?? "Interview Practice",
    difficulty: row.difficulty ?? "medium",
    sessionType: row.session_type ?? "behavioral",
    questionsCount: row.total_questions ?? orderedAnswers.length,
    answers: orderedAnswers,
    averageScore: Math.max(0, Math.min(100, row.score ?? 0)),
    createdAt: new Date(row.completed_at ?? row.created_at).getTime(),
  };
}

function isLikelyDuplicateLocal(
  localEntry: InterviewHistoryEntry,
  cloudEntries: InterviewHistoryEntry[],
): boolean {
  return cloudEntries.some((cloudEntry) => {
    const sameRole = cloudEntry.role.trim().toLowerCase() === localEntry.role.trim().toLowerCase();
    const sameType = cloudEntry.sessionType === localEntry.sessionType;
    const sameQuestions = cloudEntry.questionsCount === localEntry.questionsCount;
    const sameScore = Math.abs(cloudEntry.averageScore - localEntry.averageScore) <= 2;
    const closeInTime = Math.abs(cloudEntry.createdAt - localEntry.createdAt) <= 2 * 60 * 1000;

    return sameRole && sameType && sameQuestions && sameScore && closeInTime;
  });
}

export async function getInterviewHistory(): Promise<InterviewHistoryEntry[]> {
  const localEntries = (await getAllInterviews()).map((entry) => ({
    ...entry,
    source: "local" as const,
  }));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return localEntries.sort((a, b) => b.createdAt - a.createdAt);
  }

  const { data: sessionRows, error: sessionError } = await supabase
    .from("interview_sessions")
    .select("id, role, difficulty, session_type, total_questions, score, created_at, completed_at")
    .eq("user_id", user.id)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(50);

  if (sessionError || !sessionRows?.length) {
    return localEntries.sort((a, b) => b.createdAt - a.createdAt);
  }

  const sessionIds = sessionRows.map((row) => row.id);
  const { data: questionRows, error: questionError } = await supabase
    .from("interview_questions")
    .select("session_id, question_order, question, user_answer, ai_feedback, score")
    .in("session_id", sessionIds)
    .order("question_order", { ascending: true });

  if (questionError) {
    return localEntries.sort((a, b) => b.createdAt - a.createdAt);
  }

  const cloudEntries = sessionRows.map((row) =>
    mapCloudSession(
      row as InterviewSessionRow,
      (questionRows ?? []).filter((question) => question.session_id === row.id) as InterviewQuestionRow[],
    ),
  );

  const merged = [
    ...cloudEntries,
    ...localEntries.filter((entry) => !isLikelyDuplicateLocal(entry, cloudEntries)),
  ];

  return merged.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteInterviewHistoryEntry(
  entry: InterviewHistoryEntry,
): Promise<void> {
  if (entry.source === "cloud") {
    const { error } = await supabase.from("interview_sessions").delete().eq("id", entry.id);
    if (error) throw error;
    return;
  }

  await deleteLocalInterview(entry.id);
}
