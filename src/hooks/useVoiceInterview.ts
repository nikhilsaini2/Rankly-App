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
  const handleAnswerSubmitRef = useRef<(transcript: string) => void>(() => {});
  const currentTranscriptRef = useRef("");

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript ?? "";
    currentTranscriptRef.current = transcript;

    // Always update live transcript for interim results
    setState((s) => ({ ...s, liveTranscript: transcript }));
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted") {
      // Silently ignore - this happens when stopListeningNow() is called
      return;
    }
    if (event.error === "no-speech") {
      // Allow user to retry by going back to waitingForUser
      setState((s) => ({ ...s, phase: "waitingForUser" }));
      return;
    }
    setState((s) => ({
      ...s,
      phase: "idle",
      error: "Microphone issue. Please try again.",
    }));
  });

  const speak = useCallback((text: string, onDone?: () => void) => {
    Speech.stop();
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.9,
      onDone,
      onError: () => onDone?.(),
    });
  }, []);

  const startListening = useCallback(() => {
    currentTranscriptRef.current = ""; // Clear previous transcript
    setState((s) => ({ ...s, phase: "listening", liveTranscript: "" }));
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: false,
      androidIntentOptions: { EXTRA_LANGUAGE_MODEL: "web_search" },
    });
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const stopListeningNow = useCallback(() => {
    setState((s) => ({ ...s, phase: "processing" }));
    ExpoSpeechRecognitionModule.stop();

    // Submit the current transcript when user manually stops
    setTimeout(() => {
      const transcript = currentTranscriptRef.current;
      if (transcript.trim()) {
        handleAnswerSubmitRef.current?.(transcript);
      } else {
        setState((s) => ({ ...s, phase: "waitingForUser" }));
      }
    }, 100); // Small delay to ensure stop() completes
  }, []);

  const askQuestion = useCallback(
    (question: string) => {
      currentTranscriptRef.current = ""; // Clear previous transcript
      setState((s) => ({ ...s, phase: "speaking", liveTranscript: "" }));
      speak(question, () => {
        setState((s) => ({ ...s, phase: "waitingForUser" }));
      });
    },
    [speak],
  );

  const finishSession = useCallback(async () => {
    const results = resultsRef.current;
    const avg = Math.round(
      (results.reduce((sum, r) => sum + r.score, 0) / results.length) * 10,
    );

    setState((s) => ({
      ...s,
      phase: "complete",
      sessionScore: avg,
      results: results,
    }));

    const msg =
      avg >= 70
        ? `Great session! You scored ${avg} out of 100.`
        : `Session complete. You scored ${avg} out of 100. Review the feedback to improve.`;
    speak(msg);

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
    } catch {
      // persistence failure is non-fatal
    }
  }, [user, speak]);

  const handleAnswerSubmit = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        setState((s) => ({ ...s, phase: "waitingForUser" }));
        return;
      }

      const idx = indexRef.current;
      const questions = questionsRef.current;

      setState((s) => ({ ...s, phase: "processing" }));
      Speech.stop();

      try {
        const raw = await generateGeminiText(
          `You are an expert interview coach evaluating a candidate's spoken answer.
Role: ${roleRef.current}
Question: ${questions[idx]}
Answer: ${transcript}
Return JSON only — no markdown, no preamble:
{"score":<0-10>,"feedback":"<2-3 sentences. Specific, encouraging, conversational — this is read aloud.>"}
Scoring: 9-10=excellent, 7-8=good, 5-6=adequate, 3-4=weak, 0-2=poor.`,
        );

        const parsed = parseGeminiJson<{ score: number; feedback: string }>(
          raw,
        );
        const score = parsed?.score ?? 5;
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

        // STEP 1: Save result
        resultsRef.current = [...resultsRef.current, result];

        // STEP 2: Increment index BEFORE speak()
        const nextIndex = idx + 1;
        indexRef.current = nextIndex;

        // STEP 3: Set phase to 'feedback' with updated results and index
        setState((s) => ({
          ...s,
          phase: "feedback",
          results: resultsRef.current,
          currentIndex: nextIndex,
        }));

        // STEP 4: Speak feedback with onDone callback using captured nextIndex
        speak(feedback, () => {
          if (nextIndex < questions.length) {
            // More questions remain — ask the next one
            askQuestion(questions[nextIndex]);
          } else {
            // All questions done — finish session
            finishSession();
          }
        });
      } catch {
        setState((s) => ({
          ...s,
          phase: "idle",
          error: "Could not evaluate answer. Check your connection.",
        }));
      }
    },
    [speak, askQuestion, finishSession],
  );

  // Update ref to prevent stale closure in STT listener
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
      indexRef.current = 0;
      resultsRef.current = [];
      questionsRef.current = [];
      roleRef.current = role;

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
          setState((s) => ({
            ...s,
            phase: "idle",
            permissionDenied: true,
            error: null,
          }));
          return;
        }
      } catch {
        setState((s) => ({
          ...s,
          phase: "idle",
          error: "Could not request microphone permission.",
        }));
        return;
      }

      try {
        const raw = await generateGeminiText(
          `Generate exactly ${questionCount} interview questions for a ${role} position.
Difficulty: ${difficulty}
Type: ${sessionType} (behavioral=STAR method, technical=practical knowledge, mixed=both)
Return a JSON array only — no markdown, no preamble:
["question 1","question 2",...]
Make questions conversational — they will be read aloud. No bullet points or special characters.`,
        );

        const questions = parseGeminiJson<string[]>(raw);

        if (!questions?.length) {
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
          `Welcome to your mock interview for the ${role} position. I will ask you ${questionCount} questions. Speak your answer clearly after each question. Let's begin.`,
          () => setTimeout(() => askQuestion(questions[0]), 400),
        );
      } catch {
        setState((s) => ({
          ...s,
          phase: "idle",
          error: "Failed to start session. Check your connection.",
        }));
      }
    },
    [speak, askQuestion],
  );

  const submitManually = useCallback(() => {
    stopListening();
    if (state.liveTranscript.trim()) {
      handleAnswerSubmit(state.liveTranscript);
    }
  }, [stopListening, state.liveTranscript, handleAnswerSubmit]);

  const skipQuestion = useCallback(() => {
    Speech.stop();
    stopListening();

    const idx = indexRef.current;
    const questions = questionsRef.current;

    const skipped: VoiceResult = {
      id: `q-${idx}`,
      question: questions[idx],
      userAnswer: "[Skipped]",
      feedback: "Question was skipped.",
      score: 0,
    };

    const newResults = [...resultsRef.current, skipped];
    resultsRef.current = newResults;

    if (idx >= questions.length - 1) {
      finishSession();
    } else {
      const next = idx + 1;
      indexRef.current = next;
      setState((s) => ({ ...s, currentIndex: next, results: newResults }));
      askQuestion(questions[next]);
    }
  }, [stopListening, finishSession, askQuestion]);

  const stopSession = useCallback(() => {
    Speech.stop();
    stopListening();
    indexRef.current = 0;
    resultsRef.current = [];
    questionsRef.current = [];
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
  }, [stopListening]);

  const dismissError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    startSession,
    startListening,
    stopListeningNow,
    submitManually,
    skipQuestion,
    stopSession,
    dismissError,
  };
}
