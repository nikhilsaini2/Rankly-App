import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import { generateGeminiText } from "../services/gemini/gemini";
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
    // Only trigger evaluation if stopRecording() hasn't already done it
    // Give a 300ms grace period for stopRecording's async path to win
    if (phaseRef.current !== "recording") return;
    setTimeout(() => {
      if (!hasEvaluatedRef.current && phaseRef.current === "recording") {
        hasEvaluatedRef.current = true;
        const transcript =
          accumulatedTranscriptRef.current || liveTranscriptRef.current;
        updatePhase("processing");
        evaluateAnswerRef.current(transcript, currentQuestionRef.current);
      }
    }, 300);
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

  const evaluateAnswer = async (transcript: string, question: string) => {
    const cleanTranscript = transcript?.trim() ?? "";

    if (!cleanTranscript || cleanTranscript.length < 3) {
      setAiFeedback({
        score: 0,
        overall: "No answer detected. Please try again.",
        strengths: [],
        improvements: ["Speak clearly and provide a complete answer"],
        tip: "Try to speak for at least 3 seconds.",
      });
      setAiScore(0);
      updatePhase("showing_feedback");
      return;
    }

    setFinalTranscript(cleanTranscript);
    updatePhase("processing");

    const prompt = `You are an expert interview coach evaluating a candidate's answer.

Question: ${question}

Candidate's Answer: ${cleanTranscript}

Provide a JSON response with this exact structure:
{
  "score": <number 0-100>,
  "overall": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "tip": "<one specific actionable tip>"
}

Respond with JSON only. No markdown, no explanation outside of JSON.`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Evaluation timed out after 15 seconds")),
        15000,
      ),
    );

    try {
      const responseText = await Promise.race([
        generateGeminiText(prompt),
        timeoutPromise,
      ]);

      let parsed: AIFeedbackData;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const clean = responseText.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      }

      const score = Math.max(0, Math.min(100, Math.round(parsed.score || 0)));

      setAiScore(score);
      setAiFeedback({
        score,
        overall: parsed.overall || "Good effort overall.",
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        tip: parsed.tip || "Continue practicing to improve.",
      });

      const newAnswer: SessionAnswer = {
        question,
        transcript: cleanTranscript,
        score,
        feedback: parsed.overall || "Good effort overall.",
      };
      setAnswers((prev) => [...prev, newAnswer]);
    } catch (error: any) {
      console.error("Gemini evaluation error:", error);
      setAiFeedback({
        score: 0,
        overall: error?.message?.includes("timed out")
          ? "Evaluation took too long. Moving to next question."
          : "Evaluation failed. Please try again.",
        strengths: [],
        improvements: [],
        tip: "Check your internet connection and try again.",
      });
      setAiScore(0);
    } finally {
      updatePhase("showing_feedback");
    }
  };

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
  });

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
