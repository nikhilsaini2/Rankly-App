import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import React, { useCallback, useEffect, useState } from "react";
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
import { colors } from "../../theme/color";
import { getInterviewResultMessage } from "../../utils/score";
import { interviewStyles as s } from "./Interview.styles";
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
      ? colors.accent
      : tone === "medium"
        ? colors.warning
        : tone === "hard"
          ? colors.danger
          : colors.primary;

  const pillBgStyle = selected
    ? tone === "primary"
      ? {
          backgroundColor: "rgba(108,99,255,0.15)",
          borderColor: colors.primary,
        }
      : tone === "easy"
        ? {
            backgroundColor: "rgba(0,212,170,0.15)",
            borderColor: colors.accent,
          }
        : tone === "medium"
          ? {
              backgroundColor: "rgba(255,179,71,0.15)",
              borderColor: colors.warning,
            }
          : {
              backgroundColor: "rgba(255,92,92,0.15)",
              borderColor: colors.danger,
            }
    : { backgroundColor: "transparent", borderColor: colors.border };

  const pillTextColor = selected
    ? tone === "easy"
      ? colors.accent
      : tone === "medium"
        ? colors.warning
        : tone === "hard"
          ? colors.danger
          : colors.primary
    : colors.textSecondary;

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
            <Ionicons name="chatbubbles" size={18} color={colors.textPrimary} />
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
          placeholderTextColor={colors.placeholder}
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
          colors={[colors.primary, colors.primaryDark]}
          style={[
            s.startBtn,
            (isLoading || !role.trim()) && s.startBtnDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <View style={s.startBtnRow}>
              <Ionicons name="play" size={18} color={colors.textPrimary} />
              <Text style={s.startBtnText}>Start Session</Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={colors.textPrimary}
              />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getResultScoreColor(score: number): string {
  if (score >= 80) return colors.accent;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

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
                { backgroundColor: getResultScoreColor(item.score) },
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
  insetsBottom?: number;
}

export function InterviewScreen({
  defaultRole = "",
  onDiscussCoach,
  onViewHistory,
  insetsBottom = 0,
}: InterviewScreenProps) {
  const engine = useInterviewEngine();
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
      // On Focus: do nothing special
      return () => {
        // On Blur: Stop recording/speaking
        engine.stopRecording();
        engine.stopSpeaking();
      };
    }, [engine.stopRecording, engine.stopSpeaking]),
  );

  useSpeechRecognitionEvent("start", (engine as any).handleSpeechStart);
  useSpeechRecognitionEvent("end", (engine as any).handleSpeechEnd);
  useSpeechRecognitionEvent("result", (engine as any).handleSpeechResult);
  useSpeechRecognitionEvent("error", (engine as any).handleSpeechError);

  const handleSubmit = useCallback(
    (text: string) => {
      engine.submitAnswer(text);
    },
    [engine.submitAnswer],
  );

  const handleMicPress = useCallback(() => {
    engine.startRecording();
  }, [engine.startRecording]);

  const handleMicStop = useCallback(() => {
    engine.stopRecording();
  }, [engine.stopRecording]);

  const handleSpeaker = useCallback(() => {
    if (engine.isSpeaking) {
      engine.stopSpeaking();
    } else {
      engine.speakQuestion();
    }
  }, [engine.isSpeaking, engine.speakQuestion, engine.stopSpeaking]);

  const handleNext = useCallback(() => {
    engine.setTranscript("");
    engine.nextQuestion();
  }, [engine.nextQuestion, engine.setTranscript]);

  const handleReset = useCallback(() => {
    engine.resetSession();
  }, [engine.resetSession]);

  const handleDiscuss = useCallback(() => {
    sendInterviewContext();
    onDiscussCoach?.();
  }, [sendInterviewContext, onDiscussCoach]);

  const handleViewHistory = useCallback(() => {
    onViewHistory?.();
  }, [onViewHistory]);

  // Session Restore Modal built seamlessly into view
  if (savedSession && engine.phase === "idle") {
    return (
      <View
        style={[
          s.flex,
          { alignItems: "center", justifyContent: "center", padding: 20 },
        ]}
      >
        <View style={s.card}>
          <Text style={s.setupTitle}>Resume Interview?</Text>
          <Text style={[s.setupSubtitle, { marginTop: 8, marginBottom: 20 }]}>
            We found a saved interview session for{" "}
            {savedSession.sessionConfig.role}.
          </Text>
          <View style={{ gap: 10 }}>
            <PressableScale
              style={s.primaryButton}
              onPress={() => {
                engine.restoreSession(savedSession);
                setSavedSession(null);
              }}
            >
              <Text style={s.primaryButtonText}>Resume Session</Text>
            </PressableScale>
            <PressableScale
              style={s.ghostButton}
              onPress={async () => {
                await clearSession();
                setSavedSession(null);
              }}
            >
              <Text style={s.ghostButtonText}>Start New</Text>
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
            <Ionicons name="warning" size={48} color={colors.error} />
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Evaluating your answer…</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
