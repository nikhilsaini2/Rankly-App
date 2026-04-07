import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { TextStyle, ViewStyle } from "react-native";
import { GeminiChatTurn } from "../services/gemini";
import type { RootStackParamList, RootTabParamList } from "./navigation.types";
export type AppNameProps = {
  size?: number;
  style?: TextStyle;
};

export type Feature = {
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export type Bar = {
  label: string;
  value: number;
  colors: readonly [string, string];
};

export type ButtonProps = {
  onPress?: () => void;
  leftText?: string;
  rightText?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

export type ProgressProps = {
  size?: number;
  strokeWidth?: number;
  progress?: number;
  showGradient?: boolean;
};

export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
};

export type ExperienceLevel = "student" | "entry" | "mid" | "senior" | "lead";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  /** Display role (from `target_role` on `users`). */
  role: string;
  bio?: string;
  experienceLevel?: ExperienceLevel | null;
  industry?: string | null;
  linkedinUrl?: string | null;
  plan: "free" | "pro";
  credits: number;
  onboardingDone: boolean;
  createdAt: string;
}

export type AtsScoreRow = {
  id: string;
  userId: string;
  resumeId: string | null;
  overallScore: number;
  keywordScore: number | null;
  formatScore: number | null;
  contentScore: number | null;
  readabilityScore: number | null;
  feedback: {
    strengths?: string[];
    improvements?: string[];
  } | null;
  keywordsFound: string[] | null;
  keywordsMissing: string[] | null;
  aiSummary: string | null;
  createdAt: string;
};

export type AtsScoreSummary = {
  id: string;
  overall_score: number;
  created_at: string;
};

export type ResumeRow = {
  id: string;
  userId: string;
  title: string;
  fileUrl: string | null;
  fileName: string | null;
  rawText: string | null;
  extractedText: string | null; // New field for extracted text
  status: "uploaded" | "analyzed"; // New field for resume status
  latestScore: number | null;
  latestScoreId: string | null;
  isPrimary: boolean;
  createdAt: string;
  ats_scores: AtsScoreSummary[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

export interface StatsRowProps {
  loading: boolean;
  highestScore: any;
  resumeCount: number;
  sessionCount: number;
  navigation: NavigationProp<RootTabParamList>;
  rootNav: NavigationProp<RootStackParamList> | undefined;
}

export interface LatestScoreCardProps {
  loading: boolean;
  latestScore: any;
  rootNav: NavigationProp<RootStackParamList> | undefined;
}

export type Props = {
  size?: number;
  strokeWidth?: number;
  progress: number;
  strokeColor?: string;
  displayValue?: number;
  subtitle?: string;
  animated?: boolean;
};

export interface QuickActionsProps {
  navigation: NavigationProp<RootTabParamList>;
}

export type GenerateParams = {
  systemInstruction?: string;
  userMessage: string;
  history?: GeminiChatTurn[];
};

export type ResumeProps = {
  visible: boolean;
  scoring: boolean;
  jobDescription: string;
  onChangeText: (text: string) => void;
  onAnalyze: () => void;
  onClose: () => void;
};
