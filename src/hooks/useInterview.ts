import { useState } from "react";
import { generateGeminiText, parseGeminiJson } from "../services/gemini/gemini";
import {
  buildInterviewEvalPrompt,
  buildInterviewQuestionsPrompt,
} from "../services/gemini/prompts";
import { supabase } from "../services/supabase/supabase";
import { handleGeminiError } from "../utils/geminiErrorHandler";

function parseInterviewQuestionList(raw: string): string[] {
  try {
    const parsed = parseGeminiJson<unknown>(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      "questions" in parsed &&
      Array.isArray((parsed as { questions: unknown }).questions)
    ) {
      return (parsed as { questions: string[] }).questions.filter(
        (x) => typeof x === "string",
      );
    }
  } catch {
    /* fall through */
  }
  throw new Error("AI response was unclear. Please try again.");
}

type QRow = {
  id: string;
  question: string;
  userAnswer: string | null;
  aiFeedback: string | null;
  score: number | null;
  questionOrder: number;
};

export function useInterview() {
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState("");
  const [config, setConfig] = useState<{
    role: string;
    difficulty: "easy" | "medium" | "hard";
    sessionType: "behavioral" | "technical" | "mixed";
    questionCount: number;
  }>({
    role: "",
    difficulty: "medium",
    sessionType: "behavioral",
    questionCount: 5,
  });
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"setup" | "live" | "done">("setup");
  const [sessionScore, setSessionScore] = useState<number | null>(null);

  async function startSession(
    role: string,
    difficulty: "easy" | "medium" | "hard",
    sessionType: "behavioral" | "technical" | "mixed",
    totalQuestions: number,
  ) {
    setConfig({ role, difficulty, sessionType, questionCount: totalQuestions });
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data: sess, error: sErr } = await supabase
        .from("interview_sessions")
        .insert({
          user_id: user.id,
          role,
          difficulty,
          session_type: sessionType,
          total_questions: totalQuestions,
          completed: false,
        })
        .select()
        .single();
      if (sErr || !sess) throw sErr ?? new Error("Could not start session");

      const sid = sess.id as string;
      setSessionId(sid);
      setSessionRole(role);

      const prompt = buildInterviewQuestionsPrompt(
        role,
        difficulty,
        sessionType,
        totalQuestions,
      );
      const raw = await generateGeminiText(prompt);
      const list = parseInterviewQuestionList(raw).slice(0, totalQuestions);
      if (list.length === 0)
        throw new Error("AI response was unclear. Please try again.");

      const questionsToInsert = list.map((q, i) => ({
        session_id: sid,
        question: q,
        question_order: i,
      }));

      const { data: inserted, error: insErr } = await supabase
        .from("interview_questions")
        .insert(questionsToInsert)
        .select();

      if (insErr || !inserted?.length) {
        throw insErr ?? new Error("Could not save questions");
      }

      const rows: QRow[] = inserted.map((qRow) => ({
        id: qRow.id as string,
        question: qRow.question as string,
        userAnswer: null,
        aiFeedback: null,
        score: null,
        questionOrder: qRow.question_order as number,
      }));

      setQuestions(rows);
      setIndex(0);
      setPhase("live");
    } catch (err) {
      handleGeminiError(err, () =>
        startSession(role, difficulty, sessionType, totalQuestions),
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(text: string) {
    if (!sessionId || !questions[index]) return;
    setBusy(true);
    try {
      const q = questions[index];
      const evalPrompt = buildInterviewEvalPrompt(
        q.question,
        text,
        sessionRole || "professional",
      );
      const raw = await generateGeminiText(evalPrompt);
      const parsed = parseGeminiJson<{ score: number; feedback: string }>(raw);
      const questionScore = Math.max(0, Math.min(10, Math.round(parsed.score)));

      const { error: upErr } = await supabase
        .from("interview_questions")
        .update({
          user_answer: text,
          ai_feedback: parsed.feedback ?? "",
          score: questionScore,
          answered_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("question_order", q.questionOrder);

      if (upErr) throw upErr;

      const nextQs = [...questions];
      nextQs[index] = {
        ...q,
        userAnswer: text,
        aiFeedback: parsed.feedback ?? "",
        score: questionScore,
      };
      setQuestions(nextQs);

      if (index + 1 >= questions.length) {
        const scores = nextQs
          .map((x) => x.score)
          .filter((s): s is number => typeof s === "number");
        const avg =
          scores.length === 0
            ? 0
            : Math.round(
                (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
              );

        await supabase
          .from("interview_sessions")
          .update({
            completed: true,
            score: avg,
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        setSessionScore(avg);
        setPhase("done");
      } else {
        setIndex(index + 1);
      }
    } catch (err) {
      handleGeminiError(err, () => submitAnswer(text));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSessionId(null);
    setSessionRole("");
    setQuestions([]);
    setIndex(0);
    setPhase("setup");
    setSessionScore(null);
    setConfig((c) => ({ ...c }));
  }

  const session =
    sessionId && phase !== "setup"
      ? {
          id: sessionId,
          role: sessionRole,
          difficulty: config.difficulty,
          sessionType: config.sessionType,
          totalQuestions: config.questionCount,
          score: sessionScore,
        }
      : null;

  const currentQuestion = questions[index]?.question ?? null;

  return {
    busy,
    sessionId,
    sessionRole,
    // fields required by the premium UI spec
    config,
    setConfig: (patch: Partial<typeof config>) => {
      setConfig((prev) => ({ ...prev, ...patch }));
    },
    session,
    currentQuestion,
    currentIndex: index,
    totalQuestions: questions.length || config.questionCount,
    isLoading: busy,
    endSession: reset,

    // existing fields (used by current AIScreen)
    questions,
    index,
    phase,
    sessionScore,
    startSession,
    submitAnswer,
    reset,
  };
}
