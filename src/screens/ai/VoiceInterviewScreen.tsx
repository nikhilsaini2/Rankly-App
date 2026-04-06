import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect } from "react";
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
    submitManually,
    skipQuestion,
    stopSession,
    dismissError,
  } = useVoiceInterview(user ?? null);

  useEffect(() => {
    const timer = setTimeout(() => {
      startSession(role, difficulty, sessionType, questionCount);
    }, 300);
    return () => {
      clearTimeout(timer);
      stopSession();
    };
  }, []);

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
            Rankly needs microphone access to listen to your answers. Please
            enable it in your device settings.
          </Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsBtnTxt}>Open Settings</Text>
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
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ScoreRing
            size={100}
            progress={sessionScore}
            strokeColor={scoreTierColor(sessionScore)}
            displayValue={sessionScore}
            subtitle="Score"
          />
          <Text style={styles.resultTitle}>Session complete</Text>
          <Text style={styles.resultSub}>{getResultMessage(sessionScore)}</Text>

          {results.map((r, i) => (
            <ResultCard key={r.id} result={r} index={i} />
          ))}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              stopSession();
              startSession(role, difficulty, sessionType, questionCount);
            }}
          >
            <Text style={styles.primaryBtnTxt}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.ghostBtnTxt}>Back to interview setup</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const phaseConfig = getPhaseConfig(phase);

  return (
    <View style={[styles.container]}>
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
        {phase === "generating" || questions.length === 0 ? (
          <View style={styles.generatingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.generatingTxt}>Preparing your questions…</Text>
          </View>
        ) : (
          <Text style={styles.questionText}>
            {questions[currentIndex] ?? "…"}
          </Text>
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
          {liveTranscript ||
            (phase === "listening"
              ? "Listening…"
              : phase === "waitingForUser"
                ? "Tap the microphone to speak"
                : "Waiting for your answer…")}
        </Text>
      </View>

      <View style={styles.micSection}>
        <MicButton
          phase={phase}
          onPress={
            phase === "waitingForUser"
              ? startListening
              : phase === "listening"
                ? stopListeningNow
                : undefined
          }
        />
        <Text style={styles.micHint}>
          {phase === "listening"
            ? "Tap to submit answer early"
            : phase === "waitingForUser"
              ? "Tap the microphone to begin"
              : " "}
        </Text>
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
  const pct = total > 0 ? (progress / total) * 100 : 0;

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
  onPress,
}: {
  phase: VoicePhase;
  onPress?: () => void;
}) {
  const isWaiting = phase === "waitingForUser";
  const isListening = phase === "listening";
  const isDisabled =
    phase === "generating" ||
    phase === "processing" ||
    phase === "speaking" ||
    phase === "feedback";

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 700, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 700, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700 }),
          withTiming(0.3, { duration: 700 }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Show "Tap to speak" button
  if (isWaiting) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
          }}
        >
          <View style={[styles.micButton, styles.micButtonWaiting]}>
            <Ionicons name="mic-outline" size={34} color={colors.accent} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Show "Stop" button during recording
  if (isListening) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.6}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
          }}
        >
          <Animated.View
            style={[StyleSheet.absoluteFillObject, styles.micPulse, pulseStyle]}
          />
          <View style={[styles.micButton, styles.micButtonActive]}>
            <Ionicons name="stop" size={34} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Show disabled button for other phases
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 88,
        height: 88,
      }}
    >
      <View style={[styles.micButton, styles.micButtonDisabled]}>
        <Ionicons name="mic-outline" size={34} color={colors.textSecondary} />
      </View>
    </View>
  );
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
        <Text style={styles.resultAnswer}>{result.userAnswer}</Text>
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
      return { label: "Interviewer speaking…", color: "#8B5CF6" };
    case "waitingForUser":
      return { label: "Tap to speak when ready", color: colors.accent };
    case "listening":
      return { label: "Your turn — speak now", color: colors.accent };
    case "processing":
      return { label: "Evaluating your answer…", color: colors.primary };
    case "feedback":
      return { label: "Feedback", color: "#F59E0B" };
    default:
      return { label: "Starting…", color: colors.textSecondary };
  }
}

function getResultMessage(score: number): string {
  if (score >= 80) return "Excellent performance! You're ready to interview.";
  if (score >= 60)
    return "Good effort! A bit more practice and you'll be ready.";
  if (score >= 40) return "Keep practising. Focus on the feedback below.";
  return "Don't give up! Review the tips and try again.";
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
    marginTop: 20,
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
    minHeight: 150,
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
    marginTop: 14,
    backgroundColor: "#111122",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 16,
    minHeight: 80,
  },
  transcriptLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(144,144,176,0.5)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  transcriptText: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  transcriptPlaceholder: {
    color: "rgba(144,144,176,0.4)",
    fontStyle: "italic",
  },

  micSection: { alignItems: "center", marginTop: 28 },
  micPulse: {
    borderRadius: 44,
    backgroundColor: colors.accent,
    opacity: 0.25,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1E1E3A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: colors.danger,
    borderColor: "transparent",
  },
  micButtonWaiting: {
    backgroundColor: "rgba(0,212,170,0.1)",
    borderColor: colors.accent,
  },
  micButtonDisabled: { opacity: 0.35 },
  micHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 10,
    height: 16,
  },

  skipBtn: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipTxt: { fontSize: 13, color: colors.textSecondary },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
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
  settingsBtn: {
    width: "100%",
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  settingsBtnTxt: { fontSize: 15, fontWeight: "700", color: "#fff" },

  resultsContent: { paddingHorizontal: 20, alignItems: "center" },
  resultTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  resultSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },
  resultCard: {
    width: "100%",
    backgroundColor: "#111122",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 16,
    marginBottom: 12,
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
  },
  resultAnswer: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: 10,
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
