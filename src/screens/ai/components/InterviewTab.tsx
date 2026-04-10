import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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
import { PressableScale } from "../../../components/atoms/PressableScale";
import { ScoreRing } from "../../../components/atoms/ScoreRing";
import { VoiceInterviewSession } from "../../../components/molecules/VoiceInterviewSession";
import { useInterview } from "../../../hooks/useInterview";
import { useVoiceInterview } from "../../../hooks/useVoiceInterview";
import { colors } from "../../../theme/color";
import type { SessionAnswer } from "../../../types/common.types";
import type { RootStackParamList } from "../../../types/navigation.types";
import {
  getInterviewResultMessage,
  getQuestionScoreColor,
} from "../../../utils/score";
import { styles } from "../styles";

// ── Pill ─────────────────────────────────────────────────────

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
        styles.pillBase,
        selected && tone === "primary" && styles.pillSelectedPrimary,
        selected && tone === "easy" && styles.pillSelectedEasy,
        selected && tone === "medium" && styles.pillSelectedMedium,
        selected && tone === "hard" && styles.pillSelectedHard,
        !selected && styles.pillOff,
        animStyle,
      ]}
    >
      {selected && (
        <Ionicons
          name="checkmark"
          size={12}
          color={toneIconColor}
          style={{ marginRight: 6 }}
        />
      )}
      <Text
        style={[
          styles.pillTextBase,
          selected && tone === "primary" && styles.pillTextPrimary,
          selected && tone === "easy" && styles.pillTextEasy,
          selected && tone === "medium" && styles.pillTextMedium,
          selected && tone === "hard" && styles.pillTextHard,
          !selected && styles.pillTextMuted,
        ]}
      >
        {displayLabel}
      </Text>
    </AnimatedTouchable>
  );
}

// ── Setup phase ──────────────────────────────────────────────

type SetupProps = {
  iv: ReturnType<typeof useInterview>;
  insetsBottom: number;
  setupRole: string;
  setSetupRole: (v: string) => void;
  difficulty: "easy" | "medium" | "hard";
  setDifficulty: (v: "easy" | "medium" | "hard") => void;
  sessionType: "behavioral" | "technical" | "mixed";
  setSessionType: (v: "behavioral" | "technical" | "mixed") => void;
  numQ: number;
  setNumQ: (v: number) => void;
  voiceMode: boolean;
  setVoiceMode: (v: boolean) => void;
  hasModelError: boolean;
};

function SetupPhase({
  iv,
  insetsBottom,
  setupRole,
  setSetupRole,
  difficulty,
  setDifficulty,
  sessionType,
  setSessionType,
  numQ,
  setNumQ,
  voiceMode,
  setVoiceMode,
  hasModelError,
}: SetupProps) {
  const [roleFocused, setRoleFocused] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const opacities = [0, 0, 0, 0, 0].map(() => useSharedValue(0));
  const ys = [0, 0, 0, 0, 0].map(() => useSharedValue(10));

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

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.setupContainer,
        { paddingBottom: 40 + insetsBottom },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.setupTitle}>Mock Interview</Text>
      <Text style={styles.setupSubtitle}>
        Practice common questions for your target role
      </Text>

      <Animated.View style={[styles.setupCard, cardStyles[0]]}>
        <Text style={styles.fieldLabel}>Role</Text>
        <TextInput
          style={[styles.ivInput, roleFocused && styles.ivInputFocused]}
          value={setupRole}
          onChangeText={setSetupRole}
          placeholder="e.g. Software Engineer, Product Manager"
          placeholderTextColor={colors.textMuted}
          onFocus={() => setRoleFocused(true)}
          onBlur={() => setRoleFocused(false)}
        />
      </Animated.View>

      <Animated.View style={[styles.setupCard, cardStyles[1]]}>
        <Text style={styles.fieldLabel}>Difficulty</Text>
        <View style={styles.pillRow}>
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

      <Animated.View style={[styles.setupCard, cardStyles[2]]}>
        <Text style={styles.fieldLabel}>Session Type</Text>
        <View style={styles.pillRow}>
          {(["behavioral", "technical", "mixed"] as const).map((t) => (
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

      <Animated.View style={[styles.setupCard, cardStyles[3]]}>
        <Text style={styles.fieldLabel}>Questions</Text>
        <View style={styles.pillRow}>
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

      <Animated.View style={[styles.setupCard, cardStyles[4]]}>
        <View style={styles.voiceModeRow}>
          <View style={styles.voiceModeText}>
            <Text style={styles.fieldLabel}>Voice Mode</Text>
            <Text style={styles.voiceModeSubLabel}>
              Questions read aloud, answer by speaking
            </Text>
          </View>
          <Switch
            value={voiceMode}
            onValueChange={setVoiceMode}
            trackColor={{ false: colors.border, true: colors.primary + "30" }}
            thumbColor={voiceMode ? colors.primary : colors.textSecondary}
            ios_backgroundColor={colors.border}
            disabled={false}
          />
        </View>
      </Animated.View>

      <PressableScale
        style={styles.startButtonWrap}
        onPress={() =>
          iv.startSession(setupRole, difficulty, sessionType, numQ)
        }
        disabled={iv.busy || !setupRole.trim()}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={[
            styles.startBtn,
            (iv.busy || !setupRole.trim()) && styles.startBtnDisabledGrad,
          ]}
        >
          {iv.busy ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <View style={styles.startBtnRow}>
              <Ionicons name="play" size={18} color={colors.textPrimary} />
              <Text style={styles.startBtnText}>Start Session</Text>
            </View>
          )}
        </LinearGradient>
      </PressableScale>
    </ScrollView>
  );
}

// ── Live phase ───────────────────────────────────────────────

function LivePhase({
  iv,
  insetsBottom,
  answer,
  setAnswer,
}: {
  iv: ReturnType<typeof useInterview>;
  insetsBottom: number;
  answer: string;
  setAnswer: (v: string) => void;
}) {
  const [answerFocused, setAnswerFocused] = useState(false);
  const q = iv.questions[iv.index];
  if (!q) return null;

  const progressWidth =
    iv.questions.length > 0 ? (iv.index / iv.questions.length) * 100 : 0;
  const diff = iv.config.difficulty;

  const diffBg =
    diff === "easy"
      ? "rgba(0,212,170,0.15)"
      : diff === "medium"
        ? "rgba(255,179,71,0.15)"
        : "rgba(255,92,92,0.15)";
  const diffBorder =
    diff === "easy"
      ? colors.accent
      : diff === "medium"
        ? colors.warning
        : colors.danger;
  const diffText =
    diff === "easy"
      ? colors.accent
      : diff === "medium"
        ? colors.warning
        : colors.danger;
  const typeLabel =
    iv.config.sessionType.charAt(0).toUpperCase() +
    iv.config.sessionType.slice(1);
  const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 50}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 40 + insetsBottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.liveBody, { paddingBottom: 24 + insetsBottom }]}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Question {iv.index + 1} of {iv.questions.length}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            {progressWidth > 0 && (
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                style={[
                  styles.progressFillGrad,
                  { width: `${progressWidth}%` },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
          </View>

          <View style={styles.questionCard}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.questionAccentBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <Text style={styles.questionText}>{q.question}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChipPrimary}>
                <Text style={styles.metaChipTextPrimary}>{typeLabel}</Text>
              </View>
              <View
                style={[
                  styles.metaChip,
                  { backgroundColor: diffBg, borderColor: diffBorder },
                ]}
              >
                <Text style={[styles.metaChipText, { color: diffText }]}>
                  {diffLabel}
                </Text>
              </View>
            </View>
          </View>

          <TextInput
            multiline
            numberOfLines={6}
            placeholder="Type your answer here..."
            placeholderTextColor={colors.textMuted}
            value={answer}
            onChangeText={setAnswer}
            style={[
              styles.answerInput,
              answerFocused && styles.answerInputFocused,
            ]}
            textAlignVertical="top"
            onFocus={() => setAnswerFocused(true)}
            onBlur={() => setAnswerFocused(false)}
          />

          <View style={styles.actionRow}>
            <PressableScale
              style={styles.skipButton}
              onPress={async () => {
                setAnswer("");
                await iv.submitAnswer("(skipped)");
              }}
              disabled={iv.busy}
            >
              <Text style={styles.skipText}>Skip</Text>
            </PressableScale>
            <PressableScale
              style={[
                styles.submitButton,
                (!answer.trim() || iv.busy) && styles.submitButtonDisabled,
              ]}
              onPress={async () => {
                Keyboard.dismiss();
                const a = answer.trim();
                if (!a || iv.busy) return;
                await iv.submitAnswer(a);
                setAnswer("");
              }}
              disabled={iv.busy || !answer.trim()}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.submitGrad}
              >
                <Text style={styles.submitText}>
                  {iv.busy ? "Evaluating…" : "Submit Answer"}
                </Text>
              </LinearGradient>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Done phase ───────────────────────────────────────────────

function DonePhase({
  iv,
  insetsBottom,
  onDiscussCoach,
}: {
  iv: ReturnType<typeof useInterview>;
  insetsBottom: number;
  onDiscussCoach: () => void;
}) {
  const completed = iv.questions.filter((x: any) => x.userAnswer != null);
  const ringScore = iv.sessionScore ?? 0;

  return (
    <View style={styles.flex}>
      <FlatList
        data={completed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.resultsContent,
          { paddingBottom: 40 + insetsBottom },
        ]}
        ListHeaderComponent={
          <View style={styles.resultsHeader}>
            <View style={styles.ringWrap}>
              <ScoreRing
                progress={ringScore}
                size={100}
                strokeWidth={8}
                subtitle="Session"
                animated
              />
            </View>
            <Text style={styles.resultTitle}>Session Complete!</Text>
            <Text style={styles.resultSubtitle}>
              {getInterviewResultMessage(ringScore)}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.questionResult}>
            <View style={styles.questionResultHeader}>
              <Text style={styles.questionResultNumber}>Q{index + 1}</Text>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getQuestionScoreColor(item.score ?? 0) },
                ]}
              >
                <Text style={styles.scoreBadgeText}>
                  {item.score ?? "—"}/10
                </Text>
              </View>
            </View>
            <Text style={styles.questionResultQuestion}>{item.question}</Text>
            <Text style={styles.questionResultAnswer}>{item.userAnswer}</Text>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackLabel}>AI Feedback</Text>
              <Text style={styles.feedbackText}>{item.aiFeedback ?? "—"}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.resultsFooter}>
            <PressableScale style={styles.primaryButton} onPress={iv.reset}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </PressableScale>
            <PressableScale style={styles.ghostButton} onPress={onDiscussCoach}>
              <Text style={styles.ghostButtonText}>Discuss with AI Coach</Text>
            </PressableScale>
          </View>
        }
      />
    </View>
  );
}

// ── InterviewTab (exported) ──────────────────────────────────

type InterviewTabProps = {
  iv: ReturnType<typeof useInterview>;
  insetsBottom: number;
  setupRole: string;
  setSetupRole: (v: string) => void;
  difficulty: "easy" | "medium" | "hard";
  setDifficulty: (v: "easy" | "medium" | "hard") => void;
  sessionType: "behavioral" | "technical" | "mixed";
  setSessionType: (v: "behavioral" | "technical" | "mixed") => void;
  numQ: number;
  setNumQ: (v: number) => void;
  answer: string;
  setAnswer: (v: string) => void;
  onDiscussCoach: () => void;
};

export function InterviewTab(props: InterviewTabProps) {
  const { iv, insetsBottom, answer, setAnswer, onDiscussCoach, ...setupProps } =
    props;
  const [voiceMode, setVoiceMode] = useState(false);

  // Initialize voice interview hook at component level
  const voiceInterview = useVoiceInterview();

  // Get questions array for voice mode
  const questions = iv.questions.map((q) => q.question);

  // expo-speech-recognition needs no model - always available
  const hasModelError = false;

  const handleVoiceSessionComplete = (answers: SessionAnswer[]) => {
    // Store voice session results or navigate to summary
    console.log("Voice session completed:", answers);
    setVoiceMode(false);
    iv.reset();
  };

  const handleVoiceExit = () => {
    // voiceInterview.resetSession() is called by VoiceInterviewSession internally
    // Only reset the outer iv session here
    setVoiceMode(false);
    iv.reset();
  };

  if (iv.phase === "setup") {
    return (
      <SetupPhase
        iv={iv}
        insetsBottom={insetsBottom}
        voiceMode={voiceMode}
        setVoiceMode={setVoiceMode}
        hasModelError={hasModelError}
        setupRole={setupProps.setupRole}
        setSetupRole={setupProps.setSetupRole}
        difficulty={setupProps.difficulty}
        setDifficulty={setupProps.setDifficulty}
        sessionType={setupProps.sessionType}
        setSessionType={setupProps.setSessionType}
        numQ={setupProps.numQ}
        setNumQ={setupProps.setNumQ}
      />
    );
  }

  // If voice mode is enabled and session is live, show voice interview session
  if (voiceMode && iv.phase === "live" && questions.length > 0) {
    return (
      <VoiceInterviewSession
        questions={questions}
        sessionConfig={{
          role: setupProps.setupRole,
          difficulty: setupProps.difficulty,
          sessionType: setupProps.sessionType,
        }}
        voiceInterview={voiceInterview}
        onSessionComplete={handleVoiceSessionComplete}
        onExit={handleVoiceExit}
      />
    );
  }

  if (iv.phase === "live") {
    return (
      <LivePhase
        iv={iv}
        insetsBottom={insetsBottom}
        answer={answer}
        setAnswer={setAnswer}
      />
    );
  }

  if (iv.phase === "done") {
    return (
      <DonePhase
        iv={iv}
        insetsBottom={insetsBottom}
        onDiscussCoach={onDiscussCoach}
      />
    );
  }

  return null;
}

// Voice button styles
const voiceStyles = StyleSheet.create({
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.25)",
    backgroundColor: "rgba(0,212,170,0.06)",
    marginTop: 10,
  },
  voiceBtnDisabled: { opacity: 0.4 },
  voiceBtnTxt: { fontSize: 15, fontWeight: "600", color: colors.accent },
  newBadge: {
    backgroundColor: colors.accent,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeTxt: {
    fontSize: 9,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 0.5,
  },
});
