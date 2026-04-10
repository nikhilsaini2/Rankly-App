import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useEffect, useRef, useState } from "react";
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

  // expo-speech-recognition event listeners
  useSpeechRecognitionEvent("start", () => {
    updatePhase("recording");
    hasEvaluatedRef.current = false;
  });

  useSpeechRecognitionEvent("end", () => {
    if (phaseRef.current === "recording") {
      // end fired without a result - use whatever liveTranscript we have
      if (!hasEvaluatedRef.current) {
        hasEvaluatedRef.current = true;
        evaluateAnswerRef.current(
          liveTranscriptRef.current,
          currentQuestionRef.current,
        );
      }
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript?.trim() ?? "";
    if (event.isFinal) {
      if (!hasEvaluatedRef.current) {
        hasEvaluatedRef.current = true;
        if (transcript) {
          setFinalTranscript(transcript);
          evaluateAnswerRef.current(transcript, currentQuestionRef.current);
        } else {
          evaluateAnswerRef.current(
            liveTranscriptRef.current,
            currentQuestionRef.current,
          );
        }
      }
    } else {
      updateLiveTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.error("[SpeechRecognition] error:", event.error, event.message);
    // "no-speech" is not a fatal error - use whatever was captured
    if (event.error === "no-speech") {
      if (!hasEvaluatedRef.current) {
        hasEvaluatedRef.current = true;
        evaluateAnswerRef.current(
          liveTranscriptRef.current,
          currentQuestionRef.current,
        );
      }
      return;
    }
    updatePhase("error");
    setErrorMessage("Speech recognition error. Please try again.");
  });

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

  const speakQuestion = (questions: string[], index: number) => {
    updateCurrentQuestionIndex(index);
    updateCurrentQuestion(questions[index]);
    updatePhase("ready_to_record");
    updateLiveTranscript("");
    setFinalTranscript("");
    setAiFeedback(null);
    setAiScore(null);
    hasEvaluatedRef.current = false;
  };

  const startRecording = async () => {
    if (phaseRef.current !== "ready_to_record") return;

    updateLiveTranscript("");
    setFinalTranscript("");
    hasEvaluatedRef.current = false;

    try {
      await ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: false,
      });
      // phase set to "recording" by the "start" event listener above
    } catch (error: any) {
      console.error("[SpeechRecognition] start error:", error);
      updatePhase("error");
      setErrorMessage("Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (phaseRef.current !== "recording") return;

    try {
      await ExpoSpeechRecognitionModule.stop();
      updatePhase("processing");
      // Result handled by "result" or "end" event listeners above
    } catch (error: any) {
      console.error("[SpeechRecognition] stop error:", error);
      updatePhase("error");
      setErrorMessage("Failed to stop recording. Please try again.");
    }
  };

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

  // Keep evaluateAnswerRef always fresh
  useEffect(() => {
    evaluateAnswerRef.current = evaluateAnswer;
  });

  // Recording duration ticker
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
    requestPermissionAndStart,
    startRecording,
    stopRecording,
    nextQuestion,
    resetSession,
    openSettings,
    speakCurrentQuestion,
    stopSpeaking,
  };
}
