export type InterviewPhase =
  | "idle"
  | "ready"
  | "recording"
  | "processing"
  | "feedback"
  | "complete";

export interface Answer {
  question: string;
  transcript: string;
  score: number;
  overall: string;
  strengths: string[];
  improvements: string[];
  tip: string;
}

export interface SessionConfig {
  role: string;
  difficulty: "easy" | "medium" | "hard";
  sessionType: "behavioral" | "technical" | "mixed";
  questionCount: number;
}

export interface InterviewEngineState {
  phase: InterviewPhase;
  questions: string[];
  currentIndex: number;
  answers: Answer[];
  transcript: string;
  isRecording: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  sessionConfig: SessionConfig;
  offlineQueue: Array<{ questionIndex: number; text: string }>;
}

export type InterviewAction =
  | { type: "START_LOADING" }
  | { type: "SESSION_READY"; questions: string[]; config: SessionConfig }
  | { type: "SET_TRANSCRIPT"; transcript: string }
  | { type: "START_RECORDING" }
  | { type: "STOP_RECORDING" }
  | { type: "START_SPEAKING" }
  | { type: "STOP_SPEAKING" }
  | { type: "START_PROCESSING" }
  | { type: "EVALUATION_COMPLETE"; answer: Answer }
  | { type: "ANSWER_SUBMITTED"; answer: Answer }
  | { type: "EVALUATION_COMPLETE_ALL"; answers: Answer[] }
  | { type: "NEXT_QUESTION" }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESTORE_SESSION"; session: any }
  | { type: "RESET" };

export interface InterviewEngine {
  phase: InterviewPhase;
  questions: string[];
  currentIndex: number;
  answers: Answer[];
  transcript: string;
  isRecording: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  sessionConfig: SessionConfig;
  currentQuestion: string | null;
  currentAnswer: Answer | null;
  averageScore: number;
  progress: number;
  startSession: (config: SessionConfig) => Promise<void>;
  submitAnswer: (text: string) => Promise<void>;
  setTranscript: (text: string) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  speakQuestion: () => void;
  stopSpeaking: () => void;
  nextQuestion: () => void;
  resetSession: () => void;
  restoreSession: (session: any) => void;
}
