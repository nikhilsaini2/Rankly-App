import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Answer, InterviewEngineState, SessionConfig } from "../types/interview.types";

const SESSION_KEY = "rankly_interview_session_persistent_v1";

export interface PersistedSession {
  phase: string; // InterviewPhase
  questions: string[];
  currentIndex: number;
  answers: Answer[];
  transcript: string;
  sessionConfig: SessionConfig;
  sessionId: string | null;
  questionsDb: { id: string; questionOrder: number }[];
  timestamp: string; // for expiration
}

export async function saveSession(state: InterviewEngineState, sessionId: string | null, questionsDb: { id: string; questionOrder: number }[]) {
  if (state.phase === "idle" || state.phase === "complete") {
    // If complete or idle, we don't save an active session
    return;
  }
  try {
    const data: PersistedSession = {
      phase: state.phase, // We might restore "recording" as "ready" safely
      questions: state.questions,
      currentIndex: state.currentIndex,
      answers: state.answers,
      transcript: state.transcript,
      sessionConfig: state.sessionConfig,
      sessionId,
      questionsDb,
      timestamp: new Date().toISOString()
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save interview session to storage:", error);
  }
}

export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const dataStr = await AsyncStorage.getItem(SESSION_KEY);
    if (!dataStr) return null;
    
    const data: PersistedSession = JSON.parse(dataStr);
    
    // Check if expired (e.g., > 24 hours) - let's set 24h expiration
    const then = new Date(data.timestamp).getTime();
    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000; 

    if (now - then > maxAgeMs) {
      await clearSession();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Failed to load interview session from storage:", error);
    return null;
  }
}

export async function clearSession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear interview session from storage:", error);
  }
}
