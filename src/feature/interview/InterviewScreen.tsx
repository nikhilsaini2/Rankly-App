import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { PressableScale } from "../../components/atoms/PressableScale";
import { ScoreRing } from "../../components/atoms/ScoreRing";
import { useAIChatIntegration } from "../../hooks/useAIChatIntegration";
import { useAppTheme } from "../../theme/useAppTheme";
import { getInterviewResultMessage, scoreTierColor } from "../../utils/score";
import { createInterviewStyles } from "./Interview.styles";
import { InterviewInput } from "./components/InterviewInput";
import { QuestionHeader } from "./components/QuestionHeader";
import { useInterviewEngine } from "./hooks/useInterviewEngine";
import type { PersistedSession } from "./services/storage";
import { clearSession, loadSession } from "./services/storage";
import type { Answer, SessionConfig } from "./types/interview.types";

function Pill({
  label,
  selected,
  tone,
  onPress,
}: {
  label: string;
  selected: boolean;
  tone: "primary" | "easy" | "medium" | "hard";
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  const displayLabel =
    label.length > 0 && isNaN(Number(label))
      ? label.charAt(0).toUpperCase() + label.slice(1)
      : label;

  const toneIconColor =
    tone === "easy"
      ? theme.accent
      : tone === "medium"
        ? theme.warning
        : tone === "hard"
          ? theme.danger
          : theme.primary;

  const pillBgStyle = selected
    ? tone === "primary"
      ? {
          backgroundColor: "rgba(108,99,255,0.15)",
          borderColor: theme.primary,
        }
      : tone === "easy"
        ? {
            backgroundColor: "rgba(0,212,170,0.15)",
            borderColor: theme.accent,
          }
        : tone === "medium"
          ? {
              backgroundColor: "rgba(255,179,71,0.15)",
              borderColor: theme.warning,
            }
          : {
              backgroundColor: "rgba(255,92,92,0.15)",
              borderColor: theme.danger,
            }
    : { backgroundColor: "transparent", borderColor: theme.border };

  const pillTextColor = selected
    ? tone === "easy"
      ? theme.accent
      : tone === "medium"
        ? theme.warning
        : tone === "hard"
          ? theme.danger
          : theme.primary
    : theme.textSecondary;

  return (
    <AnimatedTouchable
      onPress={onPress}
      activeOpacity={1}
      onPressIn={() => {
        scale.value = withTiming(0.95, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 200 });
      }}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 24,
          borderWidth: 1,
        },
        pillBgStyle,
        animStyle,
      ]}
    >
      {selected && (
        <Ionicons name="checkmark" size={12} color={toneIconColor} />
      )}
      <Text
        style={{
          fontSize: 12,
          fontWeight: selected ? "600" : "400",
          textTransform: "capitalize",
          color: pillTextColor,
        }}
      >
        {displayLabel}
      </Text>
    </AnimatedTouchable>
  );
}

function SetupPhase({
  onStart,
  isLoading,
  defaultRole,
}: {
  onStart: (config: SessionConfig) => void;
  isLoading: boolean;
  defaultRole: string;
}) {
  const theme = useAppTheme();
  const s = createInterviewStyles(theme);
  const [role, setRole] = useState(defaultRole);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [sessionType, setSessionType] = useState<
    "behavioral" | "technical" | "mixed"
  >("behavioral");
  const [numQ, setNumQ] = useState(5);
  const [roleFocused, setRoleFocused] = useState(false);

  const opacities = Array.from({ length: 4 }, () => useSharedValue(0));
  const ys = Array.from({ length: 4 }, () => useSharedValue(10));

  useEffect(() => {
    opacities.forEach((op, i) => {
      op.value = 0;
      ys[i].value = 10;
      op.value = withDelay(i * 60, withTiming(1, { duration: 280 }));
      ys[i].value = withDelay(i * 60, withTiming(0, { duration: 280 }));
    });
  }, []);

  const cardStyles = opacities.map((op, i) =>
    useAnimatedStyle(() => ({
      opacity: op.value,
      transform: [{ translateY: ys[i].value }],
    })),
  );

  useEffect(() => {
    if (defaultRole && !role) setRole(defaultRole);
  }, [defaultRole]);

  const handleStart = useCallback(() => {
    Keyboard.dismiss();
    if (!role.trim() || isLoading) return;
    onStart({
      role: role.trim(),
      difficulty,
      sessionType,
      questionCount: numQ,
    });
  }, [role, difficulty, sessionType, numQ, isLoading, onStart]);

  return (
    <ScrollView
      style={s.flex}
      contentContainerStyle={[s.setupContent, { paddingBottom: 60 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.setupHeaderWrap}>
        <View style={s.setupHeaderRow}>
          <View style={s.setupIconCircle}>
            <Ionicons name="chatbubbles" size={18} color={theme.onPrimary} />
          </View>
          <Text style={s.setupTitle}>Mock Interview</Text>
        </View>
        <Text style={s.setupSubtitle}>
          Practice real interview questions with AI feedback — type or speak
          your answers
        </Text>
      </View>

      <Animated.View style={[s.card, cardStyles[0]]}>
        <Text style={s.fieldLabel}>Role</Text>
        <TextInput
          style={[s.roleInput, roleFocused && s.roleInputFocused]}
          value={role}
          onChangeText={setRole}
          placeholder="e.g. Software Engineer, Product Manager"
          placeholderTextColor={theme.placeholder}
          onFocus={() => setRoleFocused(true)}
          onBlur={() => setRoleFocused(false)}
        />
      </Animated.View>

      <Animated.View style={[s.card, cardStyles[1]]}>
        <Text style={s.fieldLabel}>Difficulty</Text>
        <View style={s.pillRow}>
          {(["easy", "medium", "hard"] as const).map((d) => (
            <Pill
              key={d}
              label={d}
              selected={difficulty === d}
              tone={d}
              onPress={() => setDifficulty(d)}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[s.card, cardStyles[2]]}>
        <Text style={s.fieldLabel}>Session Type</Text>
        <View style={s.pillRow}>
          {(["technical", "behavioral", "mixed"] as const).map((t) => (
            <Pill
              key={t}
              label={t}
              selected={sessionType === t}
              tone="primary"
              onPress={() => setSessionType(t)}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[s.card, cardStyles[3]]}>
        <Text style={s.fieldLabel}>Questions</Text>
        <View style={s.pillRow}>
          {[3, 5, 10].map((n) => (
            <Pill
              key={n}
              label={String(n)}
              selected={numQ === n}
              tone="primary"
              onPress={() => setNumQ(n)}
            />
          ))}
        </View>
      </Animated.View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[s.startButtonWrap, { height: 56 }]}
        onPress={handleStart}
        disabled={isLoading || !role.trim()}
      >
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          style={[
            s.startBtn,
            (isLoading || !role.trim()) && s.startBtnDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <View style={s.startBtnRow}>
              <Ionicons name="play" size={18} color={theme.onPrimary} />
              <Text style={s.startBtnText}>Start Session</Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={theme.onPrimary}
              />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Score color uses scoreTierColor from utils/score (centralized)

function CompletePhase({
  answers,
  averageScore,
  onReset,
  onDiscussCoach,
  onViewHistory,
}: {
  answers: Answer[];
  averageScore: number;
  onReset: () => void;
  onDiscussCoach: () => void;
  onViewHistory: () => void;
}) {
  const theme = useAppTheme();
  const s = createInterviewStyles(theme);
  return (
    <FlatList
      data={answers}
      keyExtractor={(_, index) => String(index)}
      contentContainerStyle={s.completeContent}
      ListHeaderComponent={
        <View style={s.completeHeader}>
          <View style={s.completeRingWrap}>
            <ScoreRing
              progress={averageScore}
              size={100}
              strokeWidth={8}
              subtitle="Session"
              animated
            />
          </View>
          <Text style={s.completeTitle}>Session Complete!</Text>
          <Text style={s.completeSubtitle}>
            {getInterviewResultMessage(averageScore)}
          </Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={s.resultCard}>
          <View style={s.resultCardHeader}>
            <Text style={s.resultNumber}>Q{index + 1}</Text>
            <View
              style={[
                s.scoreBadge,
                { backgroundColor: scoreTierColor(item.score) },
              ]}
            >
              <Text style={s.scoreBadgeText}>{item.score}/100</Text>
            </View>
          </View>
          <Text style={s.resultQuestion}>{item.question}</Text>
          {item.transcript && item.transcript !== "(No answer recorded)" && (
            <Text style={s.resultAnswer}>{item.transcript}</Text>
          )}
          <View style={s.resultFeedbackBox}>
            <Text style={s.resultFeedbackLabel}>AI Feedback</Text>
            <Text style={s.resultFeedbackText}>{item.overall}</Text>
          </View>
        </View>
      )}
      ListFooterComponent={
        <View style={s.completeFooter}>
          <PressableScale style={s.primaryButton} onPress={onReset}>
            <Text style={s.primaryButtonText}>Try Again</Text>
          </PressableScale>
          <PressableScale style={s.ghostButton} onPress={onDiscussCoach}>
            <Text style={s.ghostButtonText}>Discuss with AI Coach</Text>
          </PressableScale>
          <PressableScale style={s.ghostButton} onPress={onViewHistory}>
            <Text style={s.ghostButtonText}>View History</Text>
          </PressableScale>
        </View>
      }
    />
  );
}

interface InterviewScreenProps {
  defaultRole?: string;
  onDiscussCoach?: () => void;
  onViewHistory?: () => void;
  onRegisterHistoryHandler?: (handler: () => Promise<void>) => void;
  insetsBottom?: number;
}

export function InterviewScreen({
  defaultRole = "",
  onDiscussCoach,
  onViewHistory,
  onRegisterHistoryHandler,
  insetsBottom = 0,
}: InterviewScreenProps) {
  const theme = useAppTheme();
  const s = createInterviewStyles(theme);
  const engine = useInterviewEngine();
  const engineRef = useRef(engine);
  engineRef.current = engine;

  const { sendInterviewContext } = useAIChatIntegration(engine.answers);

  const [savedSession, setSavedSession] = useState<PersistedSession | null>(
    null,
  );

  useEffect(() => {
    async function checkSess() {
      const s = await loadSession();
      if (s) {
        setSavedSession(s);
      }
    }
    checkSess();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reload saved session on focus so resume modal appears after nav-away
      loadSession().then((s) => {
        if (s) setSavedSession(s);
      });
      return () => {
        // Save session before stopping so resume modal appears on return
        const phase = engineRef.current.phase;
        if (phase === "ready" || phase === "recording" || phase === "processing") {
          // Session will be saved automatically by the engine's state effect
          // Force-stop recording/speaking so the persisted state is clean
          engineRef.current.stopRecording();
          engineRef.current.stopSpeaking();
          engineRef.current.setTranscript("");
        }
      };
    }, []),
  );

  useSpeechRecognitionEvent("start", useCallback((e: any) => engineRef.current.handleSpeechStart(e), []));
  useSpeechRecognitionEvent("end", useCallback((e: any) => engineRef.current.handleSpeechEnd(e), []));
  useSpeechRecognitionEvent("result", useCallback((e: any) => engineRef.current.handleSpeechResult(e), []));
  useSpeechRecognitionEvent("error", useCallback((e: any) => engineRef.current.handleSpeechError(e), []));

  const handleSubmit = useCallback((text: string) => {
    engineRef.current.submitAnswer(text);
  }, []);

  const handleMicPress = useCallback(() => {
    engineRef.current.startRecording();
  }, []);

  const handleMicStop = useCallback(() => {
    engineRef.current.stopRecording();
  }, []);

  const handleSpeaker = useCallback(() => {
    if (engineRef.current.isSpeaking) {
      engineRef.current.stopSpeaking();
    } else {
      engineRef.current.speakQuestion();
    }
  }, []);

  const handleNext = useCallback(() => {
    engineRef.current.setTranscript("");
    engineRef.current.nextQuestion();
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current.resetSession();
  }, []);

  const handleDiscuss = useCallback(() => {
    sendInterviewContext();
    onDiscussCoach?.();
  }, [sendInterviewContext, onDiscussCoach]);

  const handleViewHistory = useCallback(async () => {
    // Save session before navigating so resume modal appears on return
    const phase = engineRef.current.phase;
    if (phase === "ready" || phase === "recording" || phase === "processing") {
      // Session will be saved automatically by the engine's state effect
      // but we need to ensure clean state before navigation
      engineRef.current.stopRecording();
      engineRef.current.stopSpeaking();
      // Small delay to ensure state is persisted before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    onViewHistory?.();
  }, [onViewHistory]);

  // Create a separate handler for registration that doesn't call onViewHistory
  const handleHistoryNavigation = useCallback(async () => {
    // Save session before navigating so resume modal appears on return
    const phase = engineRef.current.phase;
    if (phase === "ready" || phase === "recording" || phase === "processing") {
      // Session will be saved automatically by the engine's state effect
      // but we need to ensure clean state before navigation
      engineRef.current.stopRecording();
      engineRef.current.stopSpeaking();
      // Small delay to ensure state is persisted before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Don't call onViewHistory here - let the parent handle navigation directly
  }, []);

  // Register the navigation handler with parent component
  useEffect(() => {
    if (onRegisterHistoryHandler) {
      onRegisterHistoryHandler(handleHistoryNavigation);
    }
  }, [onRegisterHistoryHandler, handleHistoryNavigation]);

  // Session Restore Modal — premium centered card
  if (savedSession && engine.phase === "idle") {
    return (
      <View style={{
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}>
        <View style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 32,
          elevation: 12,
        }}>

          {/* Top accent strip */}
          <View style={{
            height: 3,
            backgroundColor: theme.primary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }} />

          <View style={{ padding: 28 }}>
            {/* Icon + header */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: "rgba(139,92,246,0.1)",
                borderWidth: 1,
                borderColor: "rgba(139,92,246,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}>
                <Ionicons name="play-circle-outline" size={26} color={theme.primary} />
              </View>

              <Text style={{
                fontSize: 21,
                fontWeight: "700",
                color: theme.textPrimary,
                letterSpacing: -0.4,
                textAlign: "center",
              }}>
                Resume Interview
              </Text>

              <Text style={{
                fontSize: 14,
                color: theme.textSecondary,
                marginTop: 6,
                textAlign: "center",
                lineHeight: 20,
              }}>
                Continue your{" "}
                <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>
                  {savedSession.sessionConfig.role}
                </Text>
                {" "}session where you left off.
              </Text>
            </View>

            {/* Session meta chips */}
            <View style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 24,
              justifyContent: "center",
            }}>
              {[
                savedSession.sessionConfig.difficulty,
                savedSession.sessionConfig.sessionType,
                `Q${savedSession.currentIndex + 1} of ${savedSession.questions.length}`,
              ].map((tag) => (
                <View key={tag} style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: theme.surfaceAlt,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: theme.textSecondary,
                    textTransform: "capitalize",
                  }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>

            {/* Primary button */}
            <PressableScale
              style={{
                height: 52,
                borderRadius: 14,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.primary,
              }}
              onPress={() => {
                // Force-reset transcript and recording state before restoring
                engineRef.current.setTranscript("");
                engineRef.current.stopRecording();
                engineRef.current.stopSpeaking();
                engine.restoreSession(savedSession);
                setSavedSession(null);
              }}
            >
              <Text style={{ color: theme.onPrimary, fontWeight: "600", fontSize: 16, letterSpacing: -0.2 }}>
                Resume Session
              </Text>
            </PressableScale>

            {/* Secondary button */}
            <PressableScale
              style={{
                height: 48,
                borderRadius: 14,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 10,
              }}
              onPress={async () => {
                await clearSession();
                setSavedSession(null);
              }}
            >
              <Text style={{ color: theme.textMuted, fontWeight: "500", fontSize: 14 }}>
                Start New Session
              </Text>
            </PressableScale>
          </View>
        </View>
      </View>
    );
  }

  if (engine.phase === "idle") {
    return (
      <SetupPhase
        onStart={engine.startSession}
        isLoading={engine.isLoading}
        defaultRole={defaultRole}
      />
    );
  }

  if (engine.phase === "complete") {
    return (
      <CompletePhase
        answers={engine.answers}
        averageScore={engine.averageScore}
        onReset={handleReset}
        onDiscussCoach={handleDiscuss}
        onViewHistory={handleViewHistory}
      />
    );
  }

  const isLast = engine.currentIndex + 1 >= engine.questions.length;

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 50}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={{ paddingBottom: 40 + insetsBottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {engine.currentQuestion && (
          <QuestionHeader
            question={engine.currentQuestion}
            index={engine.currentIndex}
            total={engine.questions.length}
            sessionType={engine.sessionConfig.sessionType}
            difficulty={engine.sessionConfig.difficulty}
            isSpeaking={engine.isSpeaking}
            onSpeakerPress={handleSpeaker}
            progress={engine.progress}
          />
        )}

        {(engine.phase === "ready" ||
          engine.phase === "recording" ||
          engine.phase === "processing") && (
          <InterviewInput
            phase={engine.phase}
            transcript={engine.transcript}
            isRecording={engine.isRecording}
            isSpeaking={engine.isSpeaking}
            isLoading={engine.isLoading}
            onTranscriptChange={engine.setTranscript}
            onSubmit={handleSubmit}
            onMicPress={handleMicPress}
            onMicStop={handleMicStop}
          />
        )}
      </ScrollView>

      {engine.error && (
        <View style={s.errorOverlay}>
          <View style={s.errorCard}>
            <Ionicons name="warning" size={48} color={theme.error} />
            <Text style={s.errorTitle}>Interview Error</Text>
            <Text style={s.errorMessage}>{engine.error}</Text>
            <TouchableOpacity style={s.errorBtn} onPress={handleReset}>
              <Text style={s.errorBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {engine.isLoading && engine.phase === "processing" && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={s.loadingText}>Evaluating your answer…</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
