import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateGeminiText } from "../services/gemini";
import { supabase } from "../services/supabase";
import type { User } from "../types";
import { parseGeminiJson } from "../utils/gemini";

export type VoicePhase =
  | "idle"
  | "generating"
  | "speaking"
  | "waitingForUser"
  | "listening"
  | "processing"
  | "feedback"
  | "complete";

export interface VoiceResult {
  id: string;
  question: string;
  userAnswer: string;
  feedback: string;
  score: number;
}

export interface VoiceInterviewState {
  phase: VoicePhase;
  questions: string[];
  results: VoiceResult[];
  currentIndex: number;
  liveTranscript: string;
  sessionScore: number | null;
  error: string | null;
  permissionDenied: boolean;
}

export function useVoiceInterview(user: User | null) {
  const [state, setState] = useState<VoiceInterviewState>({
    phase: "idle",
    questions: [],
    results: [],
    currentIndex: 0,
    liveTranscript: "",
    sessionScore: null,
    error: null,
    permissionDenied: false,
  });

  const indexRef = useRef(0);
  const questionsRef = useRef<string[]>([]);
  const resultsRef = useRef<VoiceResult[]>([]);
  const roleRef = useRef("");
  const phaseRef = useRef<VoicePhase>("idle");
  const transcriptRef = useRef("");
  const submittedRef = useRef(false);
  const ignoreSttRef = useRef(true); // starts as true — no events processed until session explicitly starts
  const sessionActiveRef = useRef(false); // true only after startSession is called
  const handleAnswerSubmitRef = useRef<(t: string) => Promise<void>>(
    async () => {},
  );

  const speak = useCallback((text: string, onDone?: () => void) => {
    Speech.stop();
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.95,
      onDone,
      onError: () => onDone?.(),
    });
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    if (ignoreSttRef.current || !sessionActiveRef.current) return;
    const transcript = event.results[0]?.transcript ?? "";
    transcriptRef.current = transcript;
    setState((s) => ({ ...s, liveTranscript: transcript }));
  });

  useSpeechRecognitionEvent("end", () => {
    if (ignoreSttRef.current || !sessionActiveRef.current) return;
    if (submittedRef.current) return;
    if (phaseRef.current !== "listening" && phaseRef.current !== "processing")
      return;

    const transcript = transcriptRef.current.trim();

    if (!transcript) {
      phaseRef.current = "waitingForUser";
      setState((s) => ({ ...s, phase: "waitingForUser" }));
      return;
    }

    submittedRef.current = true;
    phaseRef.current = "processing";
    setState((s) => ({ ...s, phase: "processing" }));
    handleAnswerSubmitRef.current(transcript);
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (ignoreSttRef.current || !sessionActiveRef.current) return;
    if (event.error === "aborted") return;
    if (event.error === "no-speech") {
      phaseRef.current = "waitingForUser";
      setState((s) => ({ ...s, phase: "waitingForUser" }));
      return;
    }
    phaseRef.current = "idle";
    setState((s) => ({
      ...s,
      phase: "idle",
      error: "Microphone issue. Please try again.",
    }));
  });

  const startListening = useCallback(() => {
    if (!sessionActiveRef.current) return;
    transcriptRef.current = "";
    submittedRef.current = false;
    ignoreSttRef.current = false;
    phaseRef.current = "listening";
    setState((s) => ({ ...s, phase: "listening", liveTranscript: "" }));
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: false,
      androidIntentOptions: { EXTRA_LANGUAGE_MODEL: "web_search" },
    });

    setTimeout(() => {
      if (!submittedRef.current && transcriptRef.current.trim()) {
        submittedRef.current = true;
        handleAnswerSubmitRef.current(transcriptRef.current.trim());
      }
    }, 500);
  }, []);

  const stopListeningNow = useCallback(() => {
    if (phaseRef.current !== "listening") return;
    phaseRef.current = "processing";
    setState((s) => ({ ...s, phase: "processing" }));
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const finishSession = useCallback(async () => {
    const results = resultsRef.current;
    const avg =
      results.length === 0
        ? 0
        : Math.round(
            (results.reduce((sum, r) => sum + r.score, 0) / results.length) *
              10,
          );

    phaseRef.current = "complete";
    setState((s) => ({ ...s, phase: "complete", sessionScore: avg, results }));

    speak(
      avg >= 70
        ? `Great session! You scored ${avg} out of 100.`
        : `Session complete. You scored ${avg} out of 100. Review the feedback to improve.`,
    );

    if (!user?.id) return;

    try {
      const { data: session } = await supabase
        .from("interview_sessions")
        .insert({
          user_id: user.id,
          role: roleRef.current,
          difficulty: "medium",
          session_type: "behavioral",
          total_questions: results.length,
          completed: true,
          score: avg,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (session) {
        await supabase.from("interview_questions").insert(
          results.map((r, i) => ({
            session_id: session.id,
            question: r.question,
            user_answer: r.userAnswer,
            ai_feedback: r.feedback,
            score: r.score,
            question_order: i,
            answered_at: new Date().toISOString(),
          })),
        );
      }
    } catch {}
  }, [user, speak]);

  const askQuestion = useCallback(
    (question: string) => {
      transcriptRef.current = "";
      submittedRef.current = false;
      ignoreSttRef.current = false;
      phaseRef.current = "speaking";
      setState((s) => ({ ...s, phase: "speaking", liveTranscript: "" }));
      speak(question, () => {
        if (ignoreSttRef.current) return;
        phaseRef.current = "waitingForUser";
        setState((s) => ({ ...s, phase: "waitingForUser" }));
      });
    },
    [speak],
  );

  const handleAnswerSubmit = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        phaseRef.current = "waitingForUser";
        setState((s) => ({ ...s, phase: "waitingForUser" }));
        return;
      }

      const idx = indexRef.current;
      const questions = questionsRef.current;

      if (!questions[idx]) {
        phaseRef.current = "waitingForUser";
        setState((s) => ({ ...s, phase: "waitingForUser" }));
        return;
      }

      phaseRef.current = "processing";
      setState((s) => ({ ...s, phase: "processing" }));
      Speech.stop();

      try {
        const start = Date.now();

        const raw = await generateGeminiText(
          `You are an expert interview coach evaluating a candidate's spoken answer.
Role: ${roleRef.current}
Question: ${questions[idx]}
Answer: ${transcript}
Return JSON only — no markdown, no preamble:
{"score":<0-10>,"feedback":"<2-3 sentences. Specific, encouraging, conversational — this is read aloud.>"}
Scoring: 9-10=excellent, 7-8=good, 5-6=adequate, 3-4=weak, 0-2=poor.`,
        );

        const elapsed = Date.now() - start;
        if (elapsed < 1200) {
          await new Promise((r) => setTimeout(r, 1200 - elapsed));
        }

        if (ignoreSttRef.current) return;

        const parsed = parseGeminiJson<{ score: number; feedback: string }>(
          raw,
        );
        const score = Math.max(0, Math.min(10, parsed?.score ?? 5));
        const feedback =
          parsed?.feedback ??
          "Good attempt. Try being more specific next time.";

        const result: VoiceResult = {
          id: `q-${idx}`,
          question: questions[idx],
          userAnswer: transcript,
          feedback,
          score,
        };

        resultsRef.current = [...resultsRef.current, result];
        const nextIndex = idx + 1;
        indexRef.current = nextIndex;

        phaseRef.current = "feedback";
        setState((s) => ({
          ...s,
          phase: "feedback",
          results: resultsRef.current,
          currentIndex: nextIndex,
        }));

        speak(feedback, () => {
          if (ignoreSttRef.current) return;
          if (nextIndex < questions.length) {
            askQuestion(questions[nextIndex]);
          } else {
            finishSession();
          }
        });
      } catch {
        if (ignoreSttRef.current) return;
        phaseRef.current = "idle";
        setState((s) => ({
          ...s,
          phase: "idle",
          error: "Could not evaluate answer. Please try again.",
        }));
      }
    },
    [speak, askQuestion, finishSession],
  );

  useEffect(() => {
    handleAnswerSubmitRef.current = handleAnswerSubmit;
  }, [handleAnswerSubmit]);

  const startSession = useCallback(
    async (
      role: string,
      difficulty: "easy" | "medium" | "hard",
      sessionType: "behavioral" | "technical" | "mixed",
      questionCount: number,
    ) => {
      sessionActiveRef.current = true;
      ignoreSttRef.current = false;
      submittedRef.current = false;
      indexRef.current = 0;
      resultsRef.current = [];
      questionsRef.current = [];
      roleRef.current = role;
      transcriptRef.current = "";

      phaseRef.current = "generating";
      setState({
        phase: "generating",
        questions: [],
        results: [],
        currentIndex: 0,
        liveTranscript: "",
        sessionScore: null,
        error: null,
        permissionDenied: false,
      });

      try {
        const perm =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) {
          phaseRef.current = "idle";
          setState((s) => ({ ...s, phase: "idle", permissionDenied: true }));
          return;
        }
      } catch {
        phaseRef.current = "idle";
        setState((s) => ({
          ...s,
          phase: "idle",
          error: "Could not request microphone permission.",
        }));
        return;
      }

      try {
        const start = Date.now();
        const raw = await generateGeminiText(
          `Generate exactly ${questionCount} interview questions for a ${role} position.
Difficulty: ${difficulty}
Type: ${sessionType}
Return a JSON array only — no markdown, no preamble:
["question 1","question 2",...]
Make questions conversational — they will be read aloud. No bullet points or special characters.`,
        );

        const elapsed = Date.now() - start;
        if (elapsed < 1200) {
          await new Promise((r) => setTimeout(r, 1200 - elapsed));
        }

        if (ignoreSttRef.current) return;

        const questions = parseGeminiJson<string[]>(raw);

        if (!questions?.length) {
          phaseRef.current = "idle";
          setState((s) => ({
            ...s,
            phase: "idle",
            error: "Failed to generate questions. Try again.",
          }));
          return;
        }

        questionsRef.current = questions;
        setState((s) => ({ ...s, questions }));

        speak(
          `Starting your ${role} interview. ${questionCount} questions. Answer clearly after each one.`,
          () => {
            if (ignoreSttRef.current) return;
            setTimeout(() => {
              if (!ignoreSttRef.current && questionsRef.current.length > 0) {
                askQuestion(questionsRef.current[0]);
              }
            }, 300);
          },
        );
      } catch {
        phaseRef.current = "idle";
        setState((s) => ({
          ...s,
          phase: "idle",
          error: "Failed to start session. Check your connection.",
        }));
      }
    },
    [speak, askQuestion],
  );

  const skipQuestion = useCallback(() => {
    submittedRef.current = true;
    ignoreSttRef.current = true;
    Speech.stop();
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {}

    const idx = indexRef.current;
    const questions = questionsRef.current;

    const skipped: VoiceResult = {
      id: `q-${idx}`,
      question: questions[idx] ?? "",
      userAnswer: "[Skipped]",
      feedback: "Question was skipped.",
      score: 0,
    };

    resultsRef.current = [...resultsRef.current, skipped];

    setTimeout(() => {
      ignoreSttRef.current = false;
      submittedRef.current = false;
      if (idx >= questions.length - 1) {
        finishSession();
      } else {
        const next = idx + 1;
        indexRef.current = next;
        setState((s) => ({
          ...s,
          currentIndex: next,
          results: resultsRef.current,
        }));
        askQuestion(questions[next]);
      }
    }, 200);
  }, [finishSession, askQuestion]);

  const stopSession = useCallback(() => {
    sessionActiveRef.current = false;
    ignoreSttRef.current = true;
    submittedRef.current = true;
    Speech.stop();
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {}
    indexRef.current = 0;
    resultsRef.current = [];
    questionsRef.current = [];
    transcriptRef.current = "";
    phaseRef.current = "idle";
    setState({
      phase: "idle",
      questions: [],
      results: [],
      currentIndex: 0,
      liveTranscript: "",
      sessionScore: null,
      error: null,
      permissionDenied: false,
    });
  }, []);

  const dismissError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    startSession,
    startListening,
    stopListeningNow,
    skipQuestion,
    stopSession,
    dismissError,
  };
}
