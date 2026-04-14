import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { AppState, AppStateStatus, Linking, Platform } from "react-native";
import { supabase } from "../../../services/supabase/supabase";
import {
  evaluateAnswer,
  generateQuestions,
} from "../services/interviewEvaluator";
import type {
  Answer,
  InterviewAction,
  InterviewEngine,
  InterviewEngineState,
  InterviewPhase,
  SessionConfig,
} from "../types/interview.types";
import NetInfo from "@react-native-community/netinfo";
import { saveSession, clearSession } from "../services/storage";
import { saveInterview } from "../services/interviewStorage";
import type { PersistedSession } from "../services/storage";

const INITIAL_STATE: InterviewEngineState = {
  phase: "idle",
  questions: [],
  currentIndex: 0,
  answers: [],
  transcript: "",
  isRecording: false,
  isSpeaking: false,
  isLoading: false,
  error: null,
  offlineQueue: [],
  sessionConfig: {
    role: "",
    difficulty: "medium",
    sessionType: "behavioral",
    questionCount: 5,
  },
};

const VALID_TRANSITIONS: Record<InterviewPhase, InterviewPhase[]> = {
  idle: ["ready", "idle"],
  ready: ["recording", "processing", "idle"],
  recording: ["ready", "processing", "idle"],
  processing: ["complete", "feedback", "ready", "idle"],
  feedback: ["ready", "complete", "idle"],
  complete: ["idle"],
};

function canTransition(from: InterviewPhase, to: InterviewPhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

function reducer(
  state: InterviewEngineState,
  action: InterviewAction,
): InterviewEngineState {
  switch (action.type) {
    case "START_LOADING":
      return { ...state, isLoading: true, error: null };

    case "SESSION_READY":
      return {
        ...INITIAL_STATE,
        phase: "ready",
        questions: action.questions,
        sessionConfig: action.config,
      };

    case "SET_TRANSCRIPT":
      return { ...state, transcript: action.transcript };

    case "START_RECORDING":
      if (!canTransition(state.phase, "recording")) return state;
      return { ...state, phase: "recording", isRecording: true };

    case "STOP_RECORDING":
      return { ...state, isRecording: false, phase: "ready" };

    case "START_SPEAKING":
      return { ...state, isSpeaking: true };

    case "STOP_SPEAKING":
      return { ...state, isSpeaking: false };

    case "START_PROCESSING":
      if (!canTransition(state.phase, "processing")) return state;
      return { ...state, phase: "processing", isRecording: false, isLoading: true };

    case "EVALUATION_COMPLETE":
      return {
        ...state,
        phase: "feedback",
        isLoading: false,
        answers: [...state.answers, action.answer],
      };

    case "ANSWER_SUBMITTED":
      return {
        ...state,
        answers: [...state.answers, action.answer],
      };

    case "EVALUATION_COMPLETE_ALL":
      return {
        ...state,
        phase: "complete",
        isLoading: false,
        answers: action.answers,
      };

    case "NEXT_QUESTION": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, phase: "complete" };
      }
      return {
        ...state,
        phase: "ready",
        currentIndex: nextIndex,
        transcript: "",
      };
    }

    case "SET_ERROR":
      return { ...state, error: action.error, isLoading: false, isRecording: false };

    case "RESTORE_SESSION": {
      let restoredPhase = action.session.phase as InterviewPhase;
      let restoredIndex = action.session.currentIndex;

      if (restoredPhase === "feedback") {
        restoredIndex++;
        if (restoredIndex >= action.session.questions.length) {
          restoredPhase = "complete";
        } else {
          restoredPhase = "ready";
        }
      }

      return {
        ...INITIAL_STATE,
        phase: restoredPhase,
        questions: action.session.questions,
        currentIndex: restoredIndex,
        answers: action.session.answers,
        transcript: restoredPhase === "ready" ? "" : action.session.transcript,
        sessionConfig: action.session.sessionConfig,
      };
    }

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

export function useInterviewEngine(): InterviewEngine {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const phaseRef = useRef<InterviewPhase>("idle");
  const isEvaluatingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const accumulatedTranscriptRef = useRef("");
  const sessionIdRef = useRef<string | null>(null);
  const questionsDbRef = useRef<{ id: string; questionOrder: number }[]>([]);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    phaseRef.current = state.phase;
    isRecordingRef.current = state.isRecording;
    isSpeakingRef.current = state.isSpeaking;

    // Persist every time state changes meaningfully
    if (state.phase !== "idle" && state.phase !== "complete") {
      saveSession(state, sessionIdRef.current, questionsDbRef.current);
    } else if (state.phase === "complete") {
      clearSession();
    }
  }, [state]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        if (isRecordingRef.current) {
          try { ExpoSpeechRecognitionModule.stop(); } catch {}
          dispatch({ type: "STOP_RECORDING" });
        }
        if (isSpeakingRef.current) {
          try { Speech.stop(); } catch {}
          dispatch({ type: "STOP_SPEAKING" });
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, []);

  const startSession = useCallback(async (config: SessionConfig) => {
    dispatch({ type: "START_LOADING" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data: sess, error: sErr } = await supabase
        .from("interview_sessions")
        .insert({
          user_id: user.id,
          role: config.role,
          difficulty: config.difficulty,
          session_type: config.sessionType,
          total_questions: config.questionCount,
          completed: false,
        })
        .select()
        .single();

      if (sErr || !sess) throw sErr ?? new Error("Could not start session");

      const sid = sess.id as string;
      sessionIdRef.current = sid;

      const questions = await generateQuestions(config);

      const questionsToInsert = questions.map((q, i) => ({
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

      questionsDbRef.current = inserted.map((row) => ({
        id: row.id as string,
        questionOrder: row.question_order as number,
      }));

      dispatch({ type: "SESSION_READY", questions, config });
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      const friendlyMsg =
        msg.includes("503") || msg.includes("high demand")
          ? "AI is experiencing high demand. Please try again in a moment."
          : msg.includes("429") || msg.includes("quota")
            ? "AI request limit reached. Please wait a minute and try again."
            : "Something went wrong. Please try again.";

      dispatch({ type: "SET_ERROR", error: friendlyMsg });
    }
  }, []);

  const submitAnswer = useCallback(async (text: string) => {
    if (isEvaluatingRef.current) return;
    if (phaseRef.current !== "ready" && phaseRef.current !== "recording") return;

    const cleanText = text.trim();
    if (!cleanText) return;

    isEvaluatingRef.current = true;

    const sid = sessionIdRef.current;
    const dbRow = questionsDbRef.current[state.currentIndex];
    const isLast = state.currentIndex + 1 >= state.questions.length;

    const stubAnswer: Answer = {
      question: state.questions[state.currentIndex],
      transcript: cleanText,
      score: 0,
      overall: "Pending evaluation...",
      strengths: [],
      improvements: [],
      tip: "",
    };

    if (sid && dbRow) {
      await supabase
        .from("interview_questions")
        .update({
          user_answer: cleanText,
          answered_at: new Date().toISOString(),
        })
        .eq("session_id", sid)
        .eq("question_order", dbRow.questionOrder);
    }

    dispatch({ type: "ANSWER_SUBMITTED", answer: stubAnswer });

    if (!isLast) {
      accumulatedTranscriptRef.current = "";
      dispatch({ type: "NEXT_QUESTION" });
      isEvaluatingRef.current = false;
      return;
    }

    // Evaluate all answers on the last question
    dispatch({ type: "START_PROCESSING" });

    try {
      const netState = await NetInfo.fetch();
      const isOffline = !netState.isConnected;

      const allTranscriptsToEval = [...state.answers, stubAnswer];
      let finalAnswers: Answer[] = [];

      if (isOffline) {
        finalAnswers = allTranscriptsToEval.map((a) => ({
          ...a,
          overall: "Pending evaluation. You are offline.",
          improvements: ["Please connect to the internet to get comprehensive AI feedback on this answer."],
          tip: "We saved your answers locally.",
        }));
      } else {
        // Parallel evaluation
        finalAnswers = await Promise.all(
          allTranscriptsToEval.map(ans =>
            evaluateAnswer(
              ans.question,
              ans.transcript,
              state.sessionConfig.role,
              state.sessionConfig.difficulty,
            )
          )
        );
      }

      if (sid) {
        for (let i = 0; i < finalAnswers.length; i++) {
          const ans = finalAnswers[i];
          const rowInfo = questionsDbRef.current[i];
          if (rowInfo) {
            await supabase
              .from("interview_questions")
              .update({
                ai_feedback: ans.overall,
                score: Math.round(ans.score / 10),
              })
              .eq("session_id", sid)
              .eq("question_order", rowInfo.questionOrder);
          }
        }

        const avg = finalAnswers.length > 0
          ? Math.round(finalAnswers.reduce((s, a) => s + a.score, 0) / finalAnswers.length)
          : 0;

        await supabase
          .from("interview_sessions")
          .update({
            completed: true,
            score: avg,
            completed_at: new Date().toISOString(),
          })
          .eq("id", sid);
      }

      dispatch({ type: "EVALUATION_COMPLETE_ALL", answers: finalAnswers });

      // Persist completed session to interview history
      try {
        await saveInterview(state.sessionConfig, finalAnswers);
      } catch (err) {
        console.warn("[InterviewEngine] Failed to save interview history", err);
        // Non-fatal — session still completes normally
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Evaluation failed. Please try again." });
    } finally {
      isEvaluatingRef.current = false;
    }
  }, [state.questions, state.currentIndex, state.sessionConfig, state.answers]);

  const setTranscript = useCallback((text: string) => {
    dispatch({ type: "SET_TRANSCRIPT", transcript: text });
  }, []);

  const startRecording = useCallback(async () => {
    if (phaseRef.current !== "ready") return;
    if (isRecordingRef.current) return;
    if (isSpeakingRef.current) {
      try { Speech.stop(); } catch {}
      dispatch({ type: "STOP_SPEAKING" });
    }

    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!granted) {
        dispatch({
          type: "SET_ERROR",
          error: Platform.OS === "android"
            ? "Microphone access denied. Voice input requires microphone permission."
            : "Microphone permission denied. Please enable it in Settings.",
        });
        return;
      }

      accumulatedTranscriptRef.current = state.transcript;
      dispatch({ type: "START_RECORDING" });

      await ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: false,
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 15000,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
        },
      });
    } catch {
      dispatch({ type: "STOP_RECORDING" });
      dispatch({ type: "SET_ERROR", error: "Failed to start voice input. Please try again." });
    }
  }, [state.transcript]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;

    dispatch({ type: "STOP_RECORDING" });

    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
  }, []);

  const speakQuestion = useCallback(() => {
    const question = state.questions[state.currentIndex];
    if (!question) return;
    if (isRecordingRef.current) return;

    if (isSpeakingRef.current) {
      try { Speech.stop(); } catch {}
    }

    dispatch({ type: "START_SPEAKING" });

    Speech.speak("", {
      onStart: () => {
        Speech.speak(question, {
          language: "en-US",
          pitch: 1.0,
          rate: 0.85,
          onDone: () => dispatch({ type: "STOP_SPEAKING" }),
          onError: () => dispatch({ type: "STOP_SPEAKING" }),
        });
      },
    });
  }, [state.questions, state.currentIndex]);

  const stopSpeaking = useCallback(() => {
    if (!isSpeakingRef.current) return;
    try { Speech.stop(); } catch {}
    dispatch({ type: "STOP_SPEAKING" });
  }, []);

  const nextQuestion = useCallback(() => {
    if (phaseRef.current !== "feedback") return;

    if (isSpeakingRef.current) {
      try { Speech.stop(); } catch {}
      dispatch({ type: "STOP_SPEAKING" });
    }

    dispatch({ type: "NEXT_QUESTION" });
  }, []);

  const resetSession = useCallback(() => {
    if (isRecordingRef.current) {
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
    }
    if (isSpeakingRef.current) {
      try { Speech.stop(); } catch {}
    }

    sessionIdRef.current = null;
    questionsDbRef.current = [];
    accumulatedTranscriptRef.current = "";
    isEvaluatingRef.current = false;

    clearSession();
    dispatch({ type: "RESET" });
  }, []);

  const restoreSession = useCallback((session: PersistedSession) => {
    sessionIdRef.current = session.sessionId;
    questionsDbRef.current = session.questionsDb;
    accumulatedTranscriptRef.current = session.transcript;
    dispatch({ type: "RESTORE_SESSION", session });
  }, []);

  const handleSpeechResult = useCallback((event: { results: any[] }) => {
    if (!isRecordingRef.current) return;

    const results = event.results ?? [];
    if (!results.length) return;

    const lastResult = results[results.length - 1];
    const transcript = (
      lastResult?.[0]?.transcript ??
      lastResult?.transcript ??
      ""
    ).trim();

    if (!transcript) return;

    const isFinal = lastResult?.isFinal ?? false;

    if (isFinal) {
      const full = accumulatedTranscriptRef.current
        ? accumulatedTranscriptRef.current + " " + transcript
        : transcript;
      accumulatedTranscriptRef.current = full;
      dispatch({ type: "SET_TRANSCRIPT", transcript: full });
    } else {
      const display = accumulatedTranscriptRef.current
        ? accumulatedTranscriptRef.current + " " + transcript
        : transcript;
      dispatch({ type: "SET_TRANSCRIPT", transcript: display });
    }
  }, []);

  const handleSpeechEnd = useCallback(() => {
    if (isRecordingRef.current) {
      dispatch({ type: "STOP_RECORDING" });
    }
  }, []);

  const handleSpeechError = useCallback((event: { error?: string }) => {
    if (event.error === "no-speech" || event.error === "aborted") return;

    if (isRecordingRef.current) {
      dispatch({ type: "STOP_RECORDING" });
    }
  }, []);

  const handleSpeechStart = useCallback(() => {}, []);

  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const currentAnswer = state.answers[state.currentIndex] ?? null;
  const averageScore =
    state.answers.length > 0
      ? Math.round(
          state.answers.reduce((sum, a) => sum + a.score, 0) / state.answers.length,
        )
      : 0;
  const progress =
    state.questions.length > 0
      ? state.currentIndex / state.questions.length
      : 0;

  return {
    phase: state.phase,
    questions: state.questions,
    currentIndex: state.currentIndex,
    answers: state.answers,
    transcript: state.transcript,
    isRecording: state.isRecording,
    isSpeaking: state.isSpeaking,
    isLoading: state.isLoading,
    error: state.error,
    sessionConfig: state.sessionConfig,
    currentQuestion,
    currentAnswer,
    averageScore,
    progress,
    startSession,
    submitAnswer,
    setTranscript,
    startRecording,
    stopRecording,
    speakQuestion,
    stopSpeaking,
    nextQuestion,
    resetSession,
    restoreSession,
    handleSpeechResult,
    handleSpeechEnd,
    handleSpeechError,
    handleSpeechStart,
  } as InterviewEngine & {
    handleSpeechResult: (event: { results: any[] }) => void;
    handleSpeechEnd: () => void;
    handleSpeechError: (event: { error?: string }) => void;
    handleSpeechStart: () => void;
  };
}
