import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import {
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScoreRing } from "../../components/atoms/ScoreRing";
import { useProfile } from "../../hooks/useProfile";
import {
  useVoiceInterview,
  type VoicePhase,
  type VoiceResult,
} from "../../hooks/useVoiceInterview";
import { colors } from "../../theme/color";
import type { RootStackParamList } from "../../types/navigation.types";
import { scoreTierColor } from "../../utils/score";

export default function VoiceInterviewScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "VoiceInterview">>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const hasStarted = useRef(false);
  const { user } = useProfile();
  const { role, difficulty, sessionType, questionCount } = route.params;

  const {
    phase,
    questions,
    results,
    currentIndex,
    liveTranscript,
    sessionScore,
    error,
    permissionDenied,
    startSession,
    startListening,
    stopListeningNow,
    skipQuestion,
    stopSession,
    dismissError,
  } = useVoiceInterview(user ?? null);

  useEffect(() => {
    if (!isFocused || hasStarted.current) return;
    hasStarted.current = true;
    const t = setTimeout(() => {
      startSession(role, difficulty, sessionType, questionCount);
    }, 300);
    return () => clearTimeout(t);
  }, [isFocused]);

  function handleBack() {
    if (phase === "complete" || phase === "idle") {
      navigation.goBack();
      return;
    }
    Alert.alert("End interview?", "Your progress will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End session",
        style: "destructive",
        onPress: () => {
          stopSession();
          navigation.goBack();
        },
      },
    ]);
  }

  if (permissionDenied) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header
          role={role}
          onBack={() => navigation.goBack()}
          progress={0}
          total={questionCount}
        />
        <View style={styles.centeredContent}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name="mic-off-outline"
              size={40}
              color={colors.textSecondary}
            />
          </View>
          <Text style={styles.permissionTitle}>Microphone access needed</Text>
          <Text style={styles.permissionSub}>
            Enable microphone access in your device settings to use voice
            interview.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.primaryBtnTxt}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.ghostBtnTxt}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === "complete" && sessionScore !== null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header
          role={role}
          onBack={() => navigation.goBack()}
          progress={questions.length}
          total={questions.length}
        />
        <ScrollView
          contentContainerStyle={[
            styles.resultsContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scoreSection}>
            <ScoreRing
              size={110}
              progress={sessionScore}
              strokeColor={scoreTierColor(sessionScore)}
              displayValue={sessionScore}
              subtitle="Score"
            />
            <Text style={styles.resultTitle}>Session Complete</Text>
            <Text style={styles.resultSub}>
              {getResultMessage(sessionScore)}
            </Text>
          </View>

          {results.map((r, i) => (
            <ResultCard key={r.id} result={r} index={i} />
          ))}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              hasStarted.current = false;
              stopSession();
              setTimeout(() => {
                hasStarted.current = true;
                startSession(role, difficulty, sessionType, questionCount);
              }, 250);
            }}
          >
            <Text style={styles.primaryBtnTxt}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.ghostBtnTxt}>Back to Setup</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const phaseConfig = getPhaseConfig(phase);
  const currentQuestion =
    questions.length > 0
      ? questions[Math.min(currentIndex, questions.length - 1)]
      : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        role={role}
        onBack={handleBack}
        progress={currentIndex}
        total={questions.length || questionCount}
      />

      <View style={styles.phaseRow}>
        <View
          style={[styles.phaseDot, { backgroundColor: phaseConfig.color }]}
        />
        <Text style={[styles.phaseLabel, { color: phaseConfig.color }]}>
          {phaseConfig.label}
        </Text>
        {(phase === "processing" || phase === "generating") && (
          <ActivityIndicator
            size="small"
            color={phaseConfig.color}
            style={{ marginLeft: 6 }}
          />
        )}
      </View>

      <View style={styles.questionCard}>
        {phase === "generating" || !currentQuestion ? (
          <View style={styles.generatingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.generatingTxt}>Preparing your questions…</Text>
          </View>
        ) : (
          <Text style={styles.questionText}>{currentQuestion}</Text>
        )}
      </View>

      <View style={styles.transcriptArea}>
        <Text style={styles.transcriptLabel}>Your answer</Text>
        <Text
          style={[
            styles.transcriptText,
            !liveTranscript && styles.transcriptPlaceholder,
          ]}
        >
          {liveTranscript || getTranscriptPlaceholder(phase)}
        </Text>
      </View>

      {phase === "processing" && (
        <View style={styles.processingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.processingText}>Submitting your answer…</Text>
        </View>
      )}

      <View style={styles.micSection}>
        <MicButton
          phase={phase}
          onTapToSpeak={startListening}
          onStopRecording={stopListeningNow}
        />
        <Text style={styles.micHint}>{getMicHint(phase)}</Text>
      </View>

      {(phase === "waitingForUser" ||
        phase === "listening" ||
        phase === "speaking") && (
        <TouchableOpacity style={styles.skipBtn} onPress={skipQuestion}>
          <Text style={styles.skipTxt}>Skip question</Text>
        </TouchableOpacity>
      )}

      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={dismissError}>
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={colors.danger}
          />
          <Text style={styles.errorTxt}>{error}</Text>
          <Ionicons name="close-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function Header({
  role,
  onBack,
  progress,
  total,
}: {
  role: string;
  onBack: () => void;
  progress: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerRole} numberOfLines={1}>
            {role}
          </Text>
          <Text style={styles.headerSub}>
            {progress < total
              ? `Q${progress + 1} of ${total}`
              : `${total} of ${total}`}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    </>
  );
}

function MicButton({
  phase,
  onTapToSpeak,
  onStopRecording,
}: {
  phase: VoicePhase;
  onTapToSpeak: () => void;
  onStopRecording: () => void;
}) {
  const isListening = phase === "listening";
  const isWaiting = phase === "waitingForUser";
  const isSpeaking = phase === "speaking";
  const isProcessing = phase === "processing";
  const isFeedback = phase === "feedback";

  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600 }),
          withTiming(0.1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1, { duration: 150 });
      ringOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: ringOpacity.value,
  }));

  if (isListening) {
    return (
      <TouchableOpacity
        onPress={onStopRecording}
        activeOpacity={0.7}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <View style={styles.micOuter}>
          <Animated.View
            style={[StyleSheet.absoluteFillObject, styles.micRing, pulseStyle]}
          />
          <View style={[styles.micButton, styles.micActive]}>
            <Ionicons name="stop" size={30} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (isWaiting) {
    return (
      <TouchableOpacity
        onPress={onTapToSpeak}
        activeOpacity={0.75}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <View style={styles.micOuter}>
          <View style={[styles.micButton, styles.micWaiting]}>
            <Ionicons name="mic-outline" size={34} color={colors.accent} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (isSpeaking) {
    return (
      <View style={styles.micOuter}>
        <View style={[styles.micButton, styles.micSpeaking]}>
          <Ionicons name="mic-outline" size={34} color={`${colors.accent}55`} />
        </View>
      </View>
    );
  }

  if (isProcessing) {
    return (
      <View style={styles.micOuter}>
        <View style={[styles.micButton, styles.micProcessing]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (isFeedback) {
    return (
      <View style={styles.micOuter}>
        <View style={[styles.micButton, styles.micFeedback]}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={30}
            color="#F59E0B"
          />
        </View>
      </View>
    );
  }

  return null;
}

function ResultCard({ result, index }: { result: VoiceResult; index: number }) {
  const scoreColor = scoreTierColor((result.score / 10) * 100);
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultCardHeader}>
        <Text style={styles.resultQNum}>Q{index + 1}</Text>
        <View
          style={[styles.resultScoreBadge, { borderColor: `${scoreColor}40` }]}
        >
          <Text style={[styles.resultScoreTxt, { color: scoreColor }]}>
            {result.score}/10
          </Text>
        </View>
      </View>
      <Text style={styles.resultQuestion}>{result.question}</Text>
      {result.userAnswer !== "[Skipped]" && (
        <Text style={styles.resultAnswer}>"{result.userAnswer}"</Text>
      )}
      <View style={styles.feedbackBox}>
        <Text style={styles.feedbackLabel}>AI Feedback</Text>
        <Text style={styles.feedbackText}>{result.feedback}</Text>
      </View>
    </View>
  );
}

function getPhaseConfig(phase: VoicePhase): { label: string; color: string } {
  switch (phase) {
    case "generating":
      return { label: "Preparing questions…", color: colors.primary };
    case "speaking":
      return {
        label: "Interviewer speaking — mic ready soon",
        color: "#8B5CF6",
      };
    case "waitingForUser":
      return { label: "Your turn — tap mic to answer", color: colors.accent };
    case "listening":
      return { label: "Recording — tap stop when done", color: colors.accent };
    case "processing":
      return { label: "Submitting your answer…", color: colors.primary };
    case "feedback":
      return { label: "AI is giving feedback…", color: "#F59E0B" };
    case "complete":
      return { label: "Session complete", color: colors.accent };
    default:
      return { label: "Starting…", color: colors.textSecondary };
  }
}

function getTranscriptPlaceholder(phase: VoicePhase): string {
  switch (phase) {
    case "speaking":
      return "AI is speaking the question…";
    case "waitingForUser":
      return "Tap the microphone to speak your answer";
    case "listening":
      return "Listening… speak clearly";
    case "processing":
      return "Processing your answer…";
    case "feedback":
      return "AI is giving feedback…";
    default:
      return "Waiting…";
  }
}

function getMicHint(phase: VoicePhase): string {
  switch (phase) {
    case "speaking":
      return "Mic will activate when question ends";
    case "waitingForUser":
      return "Tap to start recording your answer";
    case "listening":
      return "Tap stop when you finish speaking";
    case "processing":
      return "Submitting…";
    case "feedback":
      return "Listen to feedback";
    default:
      return " ";
  }
}

function getResultMessage(score: number): string {
  if (score >= 80) return "Excellent! You're ready to ace your interview.";
  if (score >= 60)
    return "Good effort! A bit more practice and you'll be ready.";
  if (score >= 40) return "Keep practising. Focus on the feedback below.";
  return "Don't give up — review the tips and try again.";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerRole: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  progressTrack: {
    height: 2,
    backgroundColor: "#1E1E3A",
    marginHorizontal: 16,
  },
  progressFill: { height: 2, backgroundColor: colors.primary, borderRadius: 1 },

  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 4,
  },
  phaseDot: { width: 7, height: 7, borderRadius: 4 },
  phaseLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },

  questionCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#13132A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(108,99,255,0.2)",
    padding: 24,
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  generatingWrap: { alignItems: "center", gap: 14 },
  generatingTxt: { fontSize: 14, color: colors.textSecondary },

  transcriptArea: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#111122",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 14,
    minHeight: 72,
  },
  transcriptLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(144,144,176,0.5)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  transcriptText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  transcriptPlaceholder: {
    color: "rgba(144,144,176,0.4)",
    fontStyle: "italic",
  },

  processingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "rgba(108,99,255,0.1)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(108,99,255,0.2)",
  },
  processingText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  micSection: { alignItems: "center", marginTop: 20 },
  micOuter: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  micRing: { borderRadius: 44, backgroundColor: colors.accent },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  micActive: {
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: "rgba(255,92,92,0.5)",
  },
  micWaiting: {
    backgroundColor: "rgba(0,212,170,0.12)",
    borderWidth: 2,
    borderColor: colors.accent,
  },
  micSpeaking: {
    backgroundColor: "rgba(139,92,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
  },
  micProcessing: {
    backgroundColor: "rgba(108,99,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(108,99,255,0.25)",
  },
  micFeedback: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  micHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 10,
    height: 16,
  },

  skipBtn: {
    alignSelf: "center",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipTxt: { fontSize: 13, color: colors.textSecondary },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "rgba(255,92,92,0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,92,92,0.2)",
  },
  errorTxt: { fontSize: 12, color: colors.danger, flex: 1 },

  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#111122",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  permissionSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },

  scoreSection: { alignItems: "center", paddingTop: 16, marginBottom: 24 },
  resultsContent: { paddingHorizontal: 20, alignItems: "center" },
  resultTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 14,
    letterSpacing: -0.5,
  },
  resultSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  resultCard: {
    width: "100%",
    backgroundColor: "#111122",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 16,
    marginBottom: 10,
  },
  resultCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultQNum: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  resultScoreBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  resultScoreTxt: { fontSize: 11, fontWeight: "700" },
  resultQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
  resultAnswer: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: 10,
    lineHeight: 18,
  },
  feedbackBox: { backgroundColor: "#0D0D1A", borderRadius: 10, padding: 12 },
  feedbackLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  feedbackText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },

  primaryBtn: {
    width: "100%",
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnTxt: { fontSize: 15, fontWeight: "700", color: "#fff" },
  ghostBtn: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  ghostBtnTxt: { fontSize: 15, color: colors.textSecondary },
});
