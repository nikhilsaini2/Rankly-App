import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  AtsScore: { resumeId: string; scoreId?: string };
  VoiceInterview: {
    role: string;
    difficulty: "easy" | "medium" | "hard";
    sessionType: "behavioral" | "technical" | "mixed";
    questionCount: number;
  };
  SalaryNegotiation: undefined;
  ResumeBuilder: undefined;
  PdfViewer: { url: string; fileName: string };
  ImprovedResumePreview: {
    resumeId: string;
    scoreId: string;
  };
  InterviewHistory: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Resume: undefined;
  AI:
    | {
        atsContext?: string;
        initialSegment?: "chat" | "interview";
      }
    | undefined;
  Profile: undefined;
};

export type TabItem = {
  name: keyof RootTabParamList;
  icon: keyof typeof Ionicons.glyphMap;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type AppStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
