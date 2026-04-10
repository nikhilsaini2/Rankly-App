import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import { generateGeminiText } from "../services/gemini";
import type { SessionAnswer, VoiceInterviewPhase } from "../types/common.types";

interface AIFeedbackData {
  score: number;
  overall: string;
  strengths: string[];
  improvements: string[];
  tip: string;
}

export function useVoiceInterview() {
  const [phase, setPhase] = useState<VoiceInterviewPhase>("idle");
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackData | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);

  // Refs to prevent stale closures
  const phaseRef = useRef<VoiceInterviewPhase>("idle");
  const liveTranscriptRef = useRef<string>("");
  const currentQuestionRef = useRef<string>("");
  const currentQuestionIndexRef = useRef<number>(0);
  const questionsRef = useRef<string[]>([]);
  const evaluateAnswerRef = useRef<
    (transcript: string, question: string) => Promise<void>
  >(async () => {});
  const hasEvaluatedRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>("");
  const isEvaluatingRef = useRef<boolean>(false);

  // Sync helpers
  const updatePhase = (p: VoiceInterviewPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const updateLiveTranscript = (t: string) => {
    liveTranscriptRef.current = t;
    setLiveTranscript(t);
  };

  const updateCurrentQuestion = (q: string | null) => {
    currentQuestionRef.current = q ?? "";
    setCurrentQuestion(q);
  };

  const updateCurrentQuestionIndex = (i: number) => {
    currentQuestionIndexRef.current = i;
    setCurrentQuestionIndex(i);
  };

  // Event handlers - called by component's useSpeechRecognitionEvent
  const handleSpeechStart = useCallback(() => {
    updatePhase("recording");
    hasEvaluatedRef.current = false;
  }, []);

  const handleSpeechEnd = useCallback(() => {
    // stopRecording() sets hasEvaluatedRef.current = true BEFORE calling stop().
    // So by the time the "end" event fires, the guard is already set.
    // We only need to handle the case where recognition ended on its own
    // (e.g., silence timeout, Android auto-stop) without stopRecording being called.
    if (hasEvaluatedRef.current) return; // stopRecording already handled this
    if (phaseRef.current !== "recording") return; // not in recording state

    // Recognition ended naturally - evaluate what we have
    hasEvaluatedRef.current = true;
    const transcript =
      accumulatedTranscriptRef.current || liveTranscriptRef.current;
    updatePhase("processing");
    evaluateAnswerRef.current(transcript, currentQuestionRef.current);
  }, []);

  const handleSpeechResult = useCallback((event: any) => {
    const results = event.results ?? [];
    if (!results.length) return;

    const lastResult = results[results.length - 1];
    const transcript = (
      lastResult?.[0]?.transcript ??
      lastResult?.transcript ??
      ""
    ).trim();
    if (!transcript) return;

    const isFinal = lastResult?.isFinal ?? event.isFinal ?? false;

    if (isFinal) {
      const full = accumulatedTranscriptRef.current
        ? accumulatedTranscriptRef.current + " " + transcript
        : transcript;
      accumulatedTranscriptRef.current = full;
      liveTranscriptRef.current = full;
      setLiveTranscript(full);
    } else {
      const display = accumulatedTranscriptRef.current
        ? accumulatedTranscriptRef.current + " " + transcript
        : transcript;
      liveTranscriptRef.current = display;
      setLiveTranscript(display);
    }
  }, []);

  const handleSpeechError = useCallback((event: any) => {
    console.error("[SpeechRecognition] error:", event.error, event.message);

    if (event.error === "no-speech") {
      if (!hasEvaluatedRef.current) {
        hasEvaluatedRef.current = true;
        const transcript =
          accumulatedTranscriptRef.current || liveTranscriptRef.current;
        updatePhase("processing");
        evaluateAnswerRef.current(transcript, currentQuestionRef.current);
      }
      return;
    }

    if (event.error === "aborted") return;

    updatePhase("error");
    setErrorMessage("Speech recognition error. Please try again.");
  }, []);

  const requestPermissionAndStart = async (questions: string[]) => {
    updatePhase("requesting_permission");
    setTotalQuestions(questions.length);
    questionsRef.current = questions;

    try {
      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!granted) {
        updatePhase("permission_denied");
        setErrorMessage(
          Platform.OS === "android"
            ? "Microphone access denied. Voice interviews require microphone permission."
            : "Microphone permission denied. Please enable it in Settings.",
        );
        return;
      }

      speakQuestion(questions, 0);
    } catch (error) {
      console.error("Permission request error:", error);
      updatePhase("permission_denied");
      setErrorMessage("Failed to request microphone permission.");
    }
  };

  const speakQuestion = useCallback((questions: string[], index: number) => {
    updateCurrentQuestionIndex(index);
    updateCurrentQuestion(questions[index]);
    updateLiveTranscript("");
    setFinalTranscript("");
    setAiFeedback(null);
    setAiScore(null);
    setErrorMessage(null);
    hasEvaluatedRef.current = false;
    accumulatedTranscriptRef.current = "";

    // Auto-speak the question
    updatePhase("speaking_question");
    Speech.speak(questions[index], {
      language: "en-US",
      pitch: 1.0,
      rate: 0.85,
      onDone: () => updatePhase("ready_to_record"),
      onError: () => updatePhase("ready_to_record"),
    });
  }, []);

  const startRecording = async () => {
    if (phaseRef.current !== "ready_to_record") return;

    updateLiveTranscript("");
    setFinalTranscript("");
    hasEvaluatedRef.current = false;
    accumulatedTranscriptRef.current = "";

    try {
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
      // phase set to "recording" by the "start" event listener above
    } catch (error: any) {
      console.error("[SpeechRecognition] start error:", error);
      updatePhase("error");
      setErrorMessage("Failed to start recording. Please try again.");
    }
  };

  const stopRecording = useCallback(async () => {
    if (phaseRef.current !== "recording") return;

    // Capture BEFORE stopping - critical
    const transcriptToEvaluate =
      accumulatedTranscriptRef.current || liveTranscriptRef.current;

    // Set guard immediately to block handleSpeechEnd race
    hasEvaluatedRef.current = true;
    updatePhase("processing");

    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.warn("[stopRecording] stop error:", e);
    }

    await evaluateAnswerRef.current(
      transcriptToEvaluate,
      currentQuestionRef.current,
    );
  }, []);

  const evaluateAnswer = useCallback(
    async (transcript: string, question: string) => {
      // Semaphore — block if already evaluating (handles any surviving race)
      if (isEvaluatingRef.current) {
        console.warn("[evaluateAnswer] blocked — already evaluating");
        return;
      }
      isEvaluatingRef.current = true;

      const cleanTranscript = transcript?.trim() ?? "";

      if (!cleanTranscript || cleanTranscript.length < 3) {
        setFinalTranscript("(No answer recorded)");
        setAiFeedback({
          score: 0,
          overall: "No answer was detected for this question.",
          strengths: [],
          improvements: ["Speak clearly into the microphone and try again."],
          tip: "Tap the mic, wait for it to turn red, then speak.",
        });
        setAiScore(0);
        updatePhase("showing_feedback");
        isEvaluatingRef.current = false;
        return;
      }

      setFinalTranscript(cleanTranscript);
      updatePhase("processing");

      // MINIMAL PROMPT - ~80 tokens max vs ~400 tokens before.
      // Truncate inputs hard: question to 150 chars, answer to 300 chars.
      // This is the single most important change for quota conservation.
      const q = question.slice(0, 150);
      const a = cleanTranscript.slice(0, 300);
      const prompt = `Evaluate interview answer. Reply ONLY valid JSON, no markdown.
Q: ${q}
A: ${a}
{"score":0-100,"overall":"2 sentences","strengths":["s1","s2"],"improvements":["i1","i2"],"tip":"1 sentence"}`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("TIMEOUT")),
          30000, // 30s covers up to 3 retries with backoff
        ),
      );

      try {
        const responseText = await Promise.race([
          generateGeminiText(prompt),
          timeoutPromise,
        ]);

        // Robust JSON parse - strips accidental markdown fences
        const cleaned = responseText.replace(/```json|```/g, "").trim();
        let parsed: AIFeedbackData;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("Could not parse AI response");
          parsed = JSON.parse(match[0]);
        }

        const score = Math.max(
          0,
          Math.min(100, Math.round(Number(parsed.score) || 0)),
        );

        setAiScore(score);
        setAiFeedback({
          score,
          overall: parsed.overall || "Good effort overall.",
          strengths: Array.isArray(parsed.strengths)
            ? parsed.strengths.slice(0, 3)
            : [],
          improvements: Array.isArray(parsed.improvements)
            ? parsed.improvements.slice(0, 3)
            : [],
          tip: parsed.tip || "Keep practicing consistently.",
        });

        setAnswers((prev) => [
          ...prev,
          {
            question,
            transcript: cleanTranscript,
            score,
            feedback: parsed.overall || "Good effort overall.",
          },
        ]);
      } catch (error: any) {
        console.error("[evaluateAnswer] final failure:", error?.message);

        const msg = error?.message?.toLowerCase() ?? "";
        const isTimeout = msg.includes("timeout");
        const isRateLimit =
          msg.includes("429") ||
          msg.includes("rate limit") ||
          msg.includes("quota") ||
          msg.includes("resource_exhausted");

        setAiFeedback({
          score: 0,
          overall: isRateLimit
            ? "AI is temporarily busy — your answer was recorded. Score will show as 0."
            : isTimeout
              ? "Evaluation took too long. Your answer was saved but could not be scored."
              : "Could not evaluate this answer. Moving on.",
          strengths: [],
          improvements: isRateLimit
            ? ["Try fewer questions per session to avoid API limits."]
            : ["Ensure a stable internet connection for scoring."],
          tip: isRateLimit
            ? "Use 3–5 questions per session for best results."
            : "Your spoken answer was still recorded correctly.",
        });
        setAiScore(0);

        // Still save the answer even on failure so session isn't lost
        setAnswers((prev) => [
          ...prev,
          {
            question,
            transcript: cleanTranscript,
            score: 0,
            feedback: "Evaluation failed — answer was recorded.",
          },
        ]);
      } finally {
        isEvaluatingRef.current = false;
        updatePhase("showing_feedback");
      }
    },
    [],
  ); // empty deps - all state access via refs

  const nextQuestion = async () => {
    const questions = questionsRef.current;
    const nextIndex = currentQuestionIndexRef.current + 1;

    if (nextIndex >= questions.length) {
      updatePhase("session_complete");
      return;
    }

    updateLiveTranscript("");
    setFinalTranscript("");
    setAiFeedback(null);
    setAiScore(null);
    setErrorMessage(null);

    speakQuestion(questions, nextIndex);
  };

  const resetSession = () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    try {
      Speech.stop();
    } catch {}

    updatePhase("idle");
    updateCurrentQuestion(null);
    updateCurrentQuestionIndex(0);
    setTotalQuestions(0);
    updateLiveTranscript("");
    setFinalTranscript("");
    setAiFeedback(null);
    setAiScore(null);
    setErrorMessage(null);
    setRecordingDuration(0);
    setAnswers([]);
    questionsRef.current = [];
    accumulatedTranscriptRef.current = "";
    hasEvaluatedRef.current = false;
    isEvaluatingRef.current = false;
  };

  const speakCurrentQuestion = () => {
    if (!currentQuestionRef.current) return;
    updatePhase("speaking_question");
    Speech.speak(currentQuestionRef.current, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.85,
      onDone: () => updatePhase("ready_to_record"),
      onError: () => updatePhase("ready_to_record"),
    });
  };

  const stopSpeaking = () => {
    try {
      Speech.stop();
    } catch {}
    if (phaseRef.current === "speaking_question") {
      updatePhase("ready_to_record");
    }
  };

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Failed to open settings:", error);
    }
  };

  useEffect(() => {
    evaluateAnswerRef.current = evaluateAnswer;
  }, [evaluateAnswer]); // only updates when function identity changes

  useEffect(() => {
    if (phase !== "recording") {
      setRecordingDuration(0);
      return;
    }
    setRecordingDuration(0);
    const interval = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  return {
    phase,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    liveTranscript,
    finalTranscript,
    aiFeedback,
    aiScore,
    errorMessage,
    isVoskReady: true, // always ready - no model loading needed
    recordingDuration,
    answers,
    // actions
    requestPermissionAndStart,
    startRecording,
    stopRecording,
    nextQuestion,
    resetSession,
    openSettings,
    speakCurrentQuestion,
    stopSpeaking,
    // event handlers - to be called by component
    handleSpeechStart,
    handleSpeechEnd,
    handleSpeechResult,
    handleSpeechError,
  };
}
