export type InterviewMode = "voice" | "text";

export type InterviewPhase =
  | "idle"
  | "requesting_permission"
  | "permission_denied"
  | "speaking_question"
  | "ready_to_record"
  | "recording"
  | "processing"
  | "showing_feedback"
  | "next"
  | "session_complete"
  | "error";

export interface Answer {
  id: string;
  question: string;
  transcript: string;
  score: number;
  overall: string;
  strengths: string[];
  improvements: string[];
  tip: string;
  createdAt: Date;
}

export interface InterviewSession {
  id: string;
  mode: InterviewMode;
  role: string;
  difficulty: string;
  sessionType: string;
  questions: string[];
  answers: Answer[];
  currentIndex: number;
  phase: InterviewPhase;
  isRecording: boolean;
  transcript: string;
  sessionConfig: {
    role: string;
    difficulty: string;
    sessionType: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewEngine {
  mode: InterviewMode;
  phase: InterviewPhase;
  questions: string[];
  currentIndex: number;
  answers: Answer[];
  isRecording: boolean;
  transcript: string;
  sessionConfig: {
    role: string;
    difficulty: string;
    sessionType: string;
  };
}

export type InterviewAction =
  | { type: "SET_MODE"; payload: InterviewMode }
  | { type: "SET_SESSION_CONFIG"; payload: InterviewSession["sessionConfig"] }
  | { type: "SET_QUESTIONS"; payload: string[] }
  | { type: "SET_CURRENT_INDEX"; payload: number }
  | { type: "ADD_ANSWER"; payload: Answer }
  | { type: "UPDATE_ANSWER"; payload: { id: string; updates: Partial<Answer> } }
  | { type: "SET_PHASE"; payload: InterviewPhase }
  | { type: "SET_RECORDING"; payload: boolean }
  | { type: "SET_TRANSCRIPT"; payload: string }
  | { type: "RESET_SESSION" }
  | { type: "LOAD_SESSION"; payload: InterviewSession };

export interface InterviewState {
  mode: InterviewMode;
  phase: InterviewPhase;
  questions: string[];
  currentIndex: number;
  answers: Answer[];
  isRecording: boolean;
  transcript: string;
  sessionConfig: InterviewSession["sessionConfig"];
  error: string | null;
  loading: boolean;
}

export interface AIFeedbackData {
  score: number;
  overall: string;
  strengths: string[];
  improvements: string[];
  tip: string;
}

export interface InterviewInputBlockProps {
  mode: InterviewMode;
  phase: InterviewPhase;
  transcript: string;
  isRecording: boolean;
  onTextSubmit: (text: string) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  disabled?: boolean;
}
