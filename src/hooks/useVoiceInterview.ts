import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { generateGeminiText } from "../services/gemini/gemini";
import type { SessionAnswer, VoiceInterviewPhase } from "../types/common.types";

interface AIFeedbackData {
  score: number;
  overall: string;
  strengths: string[];
  improvements: string[];
  tip: string;
}

// Resolve native Vosk module safely
const RNVosk =
  NativeModules.RNVosk ??
  NativeModules.Vosk ??
  NativeModules.VoskModule ??
  null;

// Build event emitter only if module exists
const VoskEmitter = RNVosk ? new NativeEventEmitter(RNVosk) : null;

// Helper to check module availability
const isVoskAvailable = (): boolean =>
  RNVosk !== null && typeof RNVosk.loadModel === "function";

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
  const [isVoskReady, setIsVoskReady] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);

  // Store subscription objects returned by Vosk listeners
  const resultSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const partialSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const errorSubscriptionRef = useRef<{ remove: () => void } | null>(null);

  // Refs to prevent stale closures
  const currentQuestionRef = useRef<string>("");
  const currentQuestionIndexRef = useRef<number>(0);
  const questionsRef = useRef<string[]>([]);
  const evaluateAnswerRef = useRef<
    (transcript: string, question: string) => Promise<void>
  >(async () => {});
  const isInitializedRef = useRef<boolean>(false);

  // Helper updaters to keep refs in sync with state
  const updateCurrentQuestion = (q: string | null) => {
    currentQuestionRef.current = q || "";
    setCurrentQuestion(q);
  };

  const updateCurrentQuestionIndex = (i: number) => {
    currentQuestionIndexRef.current = i;
    setCurrentQuestionIndex(i);
  };

  const initializeVosk = async () => {
    if (!isVoskAvailable()) {
      setPhase("error");
      setErrorMessage(
        "Speech recognition module not found. " +
          "Please rebuild: cd android && ./gradlew clean && cd .. " +
          "&& npx expo run:android",
      );
      return;
    }

    // Log available methods for debugging
    console.log("[Vosk] NativeModule keys:", Object.keys(RNVosk || {}));

    try {
      setPhase("idle");

      // Try to load model with proper error handling
      try {
        RNVosk.loadModel("model-en-us"); // synchronous, no await
        setIsVoskReady(true);
      } catch (modelError: any) {
        console.error("[Vosk] Model loading error:", modelError);

        // If model not found, provide helpful error message
        if (
          modelError?.message?.includes("FileNotFoundException") ||
          modelError?.message?.includes("model/uuid")
        ) {
          setPhase("error");
          setErrorMessage(
            "Voice recognition model not found. Please ensure the Vosk model files are included in the app assets.",
          );
          return;
        }

        // For other model loading errors
        setPhase("error");
        setErrorMessage(
          "Failed to load speech recognition model. Please restart the app.",
        );
        return;
      }

      // Register listeners and store subscription objects
      if (VoskEmitter) {
        resultSubscriptionRef.current = VoskEmitter.addListener(
          "onResult",
          (r: any) => {
            const transcript = (r?.text ?? "").trim();
            if (transcript) {
              setFinalTranscript(transcript);
              evaluateAnswerRef.current(transcript, currentQuestionRef.current);
            }
          },
        );

        partialSubscriptionRef.current = VoskEmitter.addListener(
          "onPartialResult",
          (r: any) => {
            const partial = (r?.partial ?? "").trim();
            setLiveTranscript(partial);
          },
        );

        errorSubscriptionRef.current = VoskEmitter.addListener(
          "onError",
          (e: any) => {
            console.error("Vosk error:", e);
            setPhase("error");
            setErrorMessage("Speech recognition error. Please try again.");
          },
        );
      } else {
        // Fallback to callback methods if available
        resultSubscriptionRef.current = RNVosk.onResult((r: any) => {
          const transcript = (r?.text ?? "").trim();
          if (transcript) {
            setFinalTranscript(transcript);
            evaluateAnswerRef.current(transcript, currentQuestionRef.current);
          }
        });

        partialSubscriptionRef.current = RNVosk.onPartialResult((r: any) => {
          const partial = (r?.partial ?? "").trim();
          setLiveTranscript(partial);
        });

        errorSubscriptionRef.current = RNVosk.onError((e: any) => {
          console.error("Vosk error:", e);
          setPhase("error");
          setErrorMessage("Speech recognition error. Please try again.");
        });
      }
    } catch (error) {
      console.error("Vosk initialization error:", error);
      setPhase("error");
      setErrorMessage(
        "Failed to initialize speech recognition. Please restart the app.",
      );
    }
  };

  const requestPermissionAndStart = async (questions: string[]) => {
    setPhase("requesting_permission");
    setTotalQuestions(questions.length);
    questionsRef.current = questions; // Store questions in ref

    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message:
              "Rankly needs microphone access to record your interview answers.",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          await speakQuestion(questions, 0);
        } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
          setPhase("permission_denied");
          setErrorMessage(
            "Microphone access denied. Voice interviews require microphone permission.",
          );
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          setPhase("permission_denied");
          setErrorMessage(
            "Microphone permission permanently denied. Please enable it in Settings.",
          );
        }
      } else {
        // iOS - permission is handled by the system
        await speakQuestion(questions, 0);
      }
    } catch (error) {
      console.error("Permission request error:", error);
      setPhase("permission_denied");
      setErrorMessage("Failed to request microphone permission.");
    }
  };

  const speakQuestion = async (questions: string[], index: number) => {
    updateCurrentQuestionIndex(index);
    updateCurrentQuestion(questions[index]);
    setPhase("speaking_question");
    setLiveTranscript("");
    setFinalTranscript("");
    setAiFeedback(null);
    setAiScore(null);

    Speech.speak(questions[index], {
      language: "en-US",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => {
        setPhase("ready_to_record");
      },
      onError: (_error: any) => {
        console.warn("[Speech] TTS error, continuing without audio");
        setPhase("ready_to_record");
      },
    });
  };

  const startRecording = async () => {
    if (!isVoskAvailable()) {
      setErrorMessage("Speech recognition not available on this device.");
      return;
    }

    if (!isVoskReady) {
      setErrorMessage("Speech recognition not ready. Please try again.");
      return;
    }

    if (phase !== "ready_to_record") return;

    setLiveTranscript("");
    setFinalTranscript("");
    setPhase("recording");
    setRecordingStartTime(Date.now());

    try {
      RNVosk.start({}); // synchronous, no await
    } catch (error: any) {
      console.error("Vosk start error:", error);
      setPhase("error");
      setErrorMessage("Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!isVoskAvailable()) {
      setErrorMessage("Speech recognition not available on this device.");
      return;
    }

    if (phase !== "recording") return;

    try {
      RNVosk.stop(); // synchronous, no await

      // Set up a one-time listener for the final result with fallback
      let resolved = false;
      let finalListener: any = null;

      finalListener = VoskEmitter?.addListener("onResult", (res: any) => {
        if (resolved) return;
        resolved = true;
        finalListener?.remove();
        const transcript = (res?.text ?? "").trim();
        if (transcript) {
          evaluateAnswer(transcript, currentQuestionRef.current);
        } else {
          // Fallback to live transcript if final result is empty
          evaluateAnswer(liveTranscript, currentQuestionRef.current);
        }
      });

      // Fallback timeout if onResult never fires (2 seconds)
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        finalListener?.remove();
        console.warn(
          "[Vosk] onResult timeout, using live transcript as fallback",
        );
        evaluateAnswer(liveTranscript, currentQuestionRef.current);
      }, 2000);

      setPhase("processing");
    } catch (error: any) {
      console.error("Vosk stop error:", error);
      setPhase("error");
      setErrorMessage("Failed to stop recording. Please try again.");
    }
  };

  const evaluateAnswer = async (transcript: string, question: string) => {
    // Guard against empty or too short transcript
    const cleanTranscript = transcript?.trim() || liveTranscript?.trim() || "";

    if (!cleanTranscript || cleanTranscript.length < 3) {
      setAiFeedback({
        score: 0,
        overall: "No answer detected. Please try again.",
        strengths: [],
        improvements: ["Speak clearly and provide a complete answer"],
        tip: "Try to speak for at least 3 seconds.",
      });
      setAiScore(0);
      setPhase("showing_feedback");
      return;
    }

    setFinalTranscript(cleanTranscript);
    setPhase("processing");

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

    // Add timeout to prevent hanging
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
        // Gemini sometimes wraps in ```json, strip it:
        const clean = responseText.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      }

      // Validate and clamp score
      const score = Math.max(0, Math.min(100, Math.round(parsed.score || 0)));

      setAiScore(score);
      setAiFeedback({
        score,
        overall: parsed.overall || "Good effort overall.",
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        tip: parsed.tip || "Continue practicing to improve.",
      });
      setPhase("showing_feedback");

      // Store answer
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
      // ALWAYS exit processing state, regardless of success or failure
      setPhase("showing_feedback");
    }
  };

  const nextQuestion = async () => {
    const questions = questionsRef.current;
    const nextIndex = currentQuestionIndexRef.current + 1;

    if (nextIndex >= questions.length) {
      setPhase("session_complete");
      return;
    }

    // Reset for next question
    setLiveTranscript("");
    setFinalTranscript("");
    setAiFeedback(null);
    setAiScore(null);
    setErrorMessage(null);

    await speakQuestion(questions, nextIndex);
  };

  const resetSession = () => {
    try {
      RNVosk.stop();
    } catch {} // May not be running, ignore errors
    try {
      Speech.stop();
    } catch {} // Speech.stop() returns Promise

    // Reset all state
    setPhase("idle");
    updateCurrentQuestion(null);
    updateCurrentQuestionIndex(0);
    setTotalQuestions(0);
    setLiveTranscript("");
    setFinalTranscript("");
    setAiFeedback(null);
    setAiScore(null);
    setErrorMessage(null);
    setRecordingStartTime(0);
    setAnswers([]);
  };

  const getRecordingDuration = () => {
    if (phase !== "recording" || recordingStartTime === 0) return 0;
    return Math.floor((Date.now() - recordingStartTime) / 1000);
  };

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Failed to open settings:", error);
    }
  };

  // Keep evaluateAnswerRef fresh in a no-deps useEffect
  useEffect(() => {
    evaluateAnswerRef.current = evaluateAnswer;
  }); // no deps — runs every render to stay fresh

  // Initialize Vosk on mount with guard
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    initializeVosk();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isInitializedRef.current = false; // allow re-init if truly remounted

      // Stop Vosk and Speech
      try {
        RNVosk.stop();
      } catch {}
      try {
        Speech.stop();
      } catch {}

      // Remove listeners using subscription.remove()
      resultSubscriptionRef.current?.remove();
      partialSubscriptionRef.current?.remove();
      errorSubscriptionRef.current?.remove();
    };
  }, []);

  return {
    // State
    phase,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    liveTranscript,
    finalTranscript,
    aiFeedback,
    aiScore,
    errorMessage,
    isVoskReady,
    recordingDuration: getRecordingDuration(),
    answers,

    // Actions
    requestPermissionAndStart,
    startRecording,
    stopRecording,
    nextQuestion,
    resetSession,
    openSettings,
  };
}
