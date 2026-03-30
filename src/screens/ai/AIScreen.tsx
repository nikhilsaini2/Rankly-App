import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "../../components/atoms/PressableScale";
import { ScoreRing } from "../../components/atoms/ScoreRing";
import { AI_STARTER_PROMPTS } from "../../constants/content";
import { useAIChat } from "../../hooks/useAIChat";
import { useInterview } from "../../hooks/useInterview";
import { useProfile } from "../../hooks/useProfile";
import { colors } from "../../theme/color";
import type { ChatMessage } from "../../types/common.types";
import type { RootTabParamList } from "../../types/navigation.types";
import { formatTime } from "../../utils/date";
import {
  getInterviewResultMessage,
  getQuestionScoreColor,
} from "../../utils/score";

function MessageBubble({
  item,
  showRanklyLabel,
}: {
  item: ChatMessage;
  showRanklyLabel: boolean;
}) {
  const isUser = item.role === "user";
  return (
    <View
      style={[
        styles.bubbleWrap,
        isUser ? styles.bubbleWrapUser : styles.bubbleWrapAi,
      ]}
    >
      {!isUser && showRanklyLabel ? (
        <Text style={styles.ranklyLabel}>Rankly AI</Text>
      ) : null}
      <View
        style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}
      >
        <Text style={isUser ? styles.bubbleUserText : styles.bubbleAiText}>
          {item.content}
        </Text>
      </View>
      <Text style={styles.msgTime}>
        {item.createdAt ? formatTime(item.createdAt) : ""}
      </Text>
    </View>
  );
}

function TypingIndicator() {
  const o1 = useSharedValue(0.3);
  const o2 = useSharedValue(0.3);
  const o3 = useSharedValue(0.3);
  useEffect(() => {
    const cycle = { duration: 800 } as const;
    o1.value = withRepeat(
      withSequence(withTiming(1, cycle), withTiming(0.3, cycle)),
      -1,
    );
    o2.value = withDelay(
      150,
      withRepeat(
        withSequence(withTiming(1, cycle), withTiming(0.3, cycle)),
        -1,
      ),
    );
    o3.value = withDelay(
      300,
      withRepeat(
        withSequence(withTiming(1, cycle), withTiming(0.3, cycle)),
        -1,
      ),
    );
  }, [o1, o2, o3]);
  const s1 = useAnimatedStyle(() => ({ opacity: o1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: o2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: o3.value }));
  return (
    <View style={styles.typingRow}>
      <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.dot, s1]} />
          <Animated.View style={[styles.dot, s2]} />
          <Animated.View style={[styles.dot, s3]} />
        </View>
      </View>
    </View>
  );
}

const Pill = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.pill, selected && styles.pillOn]}
  >
    <Text style={[styles.pillText, selected && styles.pillTextOn]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootTabParamList, "AI">>();
  const atsContext = route.params?.atsContext;
  const initialSegment = route.params?.initialSegment;

  const { user } = useProfile();
  const chat = useAIChat(user);
  const iv = useInterview();

  const [segment, setSegment] = useState<"chat" | "interview">("chat");
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");

  const roleDefault = user?.role ?? "";
  const [setupRole, setSetupRole] = useState(roleDefault);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium",
  );
  const [sessionType, setSessionType] = useState<
    "behavioral" | "technical" | "mixed"
  >("behavioral");
  const [numQ, setNumQ] = useState(5);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const contextSentRef = useRef(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const screenAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [opacity, translateY]);

  useEffect(() => {
    setSetupRole(roleDefault);
  }, [roleDefault]);
  useEffect(() => {
    if (initialSegment) setSegment(initialSegment);
  }, [initialSegment]);
  useEffect(() => {
    contextSentRef.current = false;
  }, [atsContext]);

  useEffect(() => {
    if (!atsContext || !chat.ready || contextSentRef.current) return;
    if (chat.messages.length > 0) return;
    contextSentRef.current = true;
    void chat.send(atsContext).catch(() => {
      contextSentRef.current = false;
    });
  }, [atsContext, chat.ready, chat.messages.length, chat.send]);

  const reversedMessages = [...chat.messages].reverse();

  async function onSendChat() {
    const t = input.trim();
    if (!t || chat.loading) return;
    setInput("");
    await chat.send(t);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <Animated.View style={[styles.flex, screenAnim]}>
        <Text style={styles.screenTitle}>AI Coach</Text>
        <View style={styles.seg}>
          <SegBtn
            label="Chat"
            active={segment === "chat"}
            onPress={() => setSegment("chat")}
          />
          <SegBtn
            label="Interview"
            active={segment === "interview"}
            onPress={() => setSegment("interview")}
          />
        </View>

        {segment === "chat" ? (
          !chat.ready ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : chat.messages.length === 0 ? (
            <View style={[styles.chatBody, styles.welcomeOuter]}>
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeEmoji}>🤖</Text>
                <Text style={styles.welcomeTitle}>Your AI Career Coach</Text>
                <Text style={styles.welcomeSubtitle}>
                  Ask me anything about your resume, job search, salary
                  negotiation, or interview prep.
                </Text>
                {AI_STARTER_PROMPTS.map((prompt) => (
                  <PressableScale
                    key={prompt}
                    style={styles.starterChip}
                    onPress={() => {
                      if (!chat.loading) void chat.send(prompt);
                    }}
                    disabled={chat.loading}
                  >
                    <Text style={styles.starterText}>{prompt}</Text>
                  </PressableScale>
                ))}
              </View>
              {chat.loading ? <TypingIndicator /> : null}
              <InputBar
                input={input}
                setInput={setInput}
                onSend={onSendChat}
                disabled={chat.loading}
                insetsBottom={insets.bottom}
              />
            </View>
          ) : (
            <View style={styles.chatBody}>
              <FlatList
                ref={listRef}
                inverted
                data={reversedMessages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() =>
                  listRef.current?.scrollToOffset({ offset: 0, animated: true })
                }
                renderItem={({ item, index }) => {
                  const older = reversedMessages[index + 1];
                  const showRanklyLabel =
                    item.role === "assistant" &&
                    (!older || older.role !== "assistant");
                  return (
                    <MessageBubble
                      item={item}
                      showRanklyLabel={showRanklyLabel}
                    />
                  );
                }}
              />
              {chat.loading ? <TypingIndicator /> : null}
              <InputBar
                input={input}
                setInput={setInput}
                onSend={onSendChat}
                disabled={chat.loading}
                insetsBottom={insets.bottom}
              />
            </View>
          )
        ) : (
          <InterviewPanel
            iv={iv}
            insetsBottom={insets.bottom}
            setupRole={setupRole}
            setSetupRole={setSetupRole}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            sessionType={sessionType}
            setSessionType={setSessionType}
            numQ={numQ}
            setNumQ={setNumQ}
            answer={answer}
            setAnswer={setAnswer}
            onDiscussCoach={() => setSegment("chat")}
          />
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function InputBar({
  input,
  setInput,
  onSend,
  disabled,
  insetsBottom,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  insetsBottom: number;
}) {
  const canSend = input.trim().length > 0 && !disabled;
  return (
    <View style={[styles.inputRow, { paddingBottom: 12 + insetsBottom }]}>
      <TextInput
        style={styles.input}
        placeholder="Ask your career coach..."
        placeholderTextColor={colors.textMuted}
        value={input}
        onChangeText={setInput}
        multiline
      />
      <PressableScale
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        onPress={onSend}
        disabled={!canSend}
      >
        <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} />
      </PressableScale>
    </View>
  );
}

function SegBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={{ flex: 1 }} onPress={onPress}>
      {active ? (
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.segActive}
        >
          <Text style={styles.segActiveText}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.segInactive}>
          <Text style={styles.segInactiveText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function InterviewPanel({
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
  answer,
  setAnswer,
  onDiscussCoach,
}: {
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
}) {
  if (iv.phase === "setup") {
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

        <Text style={styles.fieldLabel}>Role</Text>
        <TextInput
          style={styles.ivInput}
          value={setupRole}
          onChangeText={setSetupRole}
          placeholder="e.g. Software Engineer, Product Manager"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Difficulty</Text>
        <View style={styles.pillRow}>
          {(["easy", "medium", "hard"] as const).map((d) => (
            <Pill
              key={d}
              label={d}
              selected={difficulty === d}
              onPress={() => setDifficulty(d)}
            />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Session Type</Text>
        <View style={styles.pillRow}>
          {(["behavioral", "technical", "mixed"] as const).map((t) => (
            <Pill
              key={t}
              label={t}
              selected={sessionType === t}
              onPress={() => setSessionType(t)}
            />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Questions</Text>
        <View style={styles.pillRow}>
          {[3, 5, 10].map((n) => (
            <Pill
              key={n}
              label={String(n)}
              selected={numQ === n}
              onPress={() => setNumQ(n)}
            />
          ))}
        </View>

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
              <Text style={styles.startBtnText}>Start Session →</Text>
            )}
          </LinearGradient>
        </PressableScale>
      </ScrollView>
    );
  }

  if (iv.phase === "live" && iv.questions[iv.index]) {
    const q = iv.questions[iv.index];
    const progressWidth =
      iv.questions.length > 0 ? (iv.index / iv.questions.length) * 100 : 0;
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.liveBody, { paddingBottom: 24 + insetsBottom }]}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Question {iv.index + 1} of {iv.questions.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressWidth}%` }]}
              />
            </View>
          </View>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{q.question}</Text>
          </View>
          <TextInput
            multiline
            numberOfLines={6}
            placeholder="Type your answer here..."
            placeholderTextColor={colors.textMuted}
            value={answer}
            onChangeText={setAnswer}
            style={styles.answerInput}
            textAlignVertical="top"
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
                const a = answer.trim();
                if (!a || iv.busy) return;
                await iv.submitAnswer(a);
                setAnswer("");
              }}
              disabled={iv.busy || !answer.trim()}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.submitGrad}
              >
                <Text style={styles.submitText}>
                  {iv.busy ? "Evaluating…" : "Submit Answer"}
                </Text>
              </LinearGradient>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (iv.phase === "done") {
    const completed = iv.questions.filter((x) => x.userAnswer != null);
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
                <Text style={styles.feedbackText}>
                  {item.aiFeedback ?? "—"}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.resultsFooter}>
              <PressableScale style={styles.primaryButton} onPress={iv.reset}>
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </PressableScale>
              <PressableScale
                style={styles.ghostButton}
                onPress={onDiscussCoach}
              >
                <Text style={styles.ghostButtonText}>
                  Discuss with AI Coach
                </Text>
              </PressableScale>
            </View>
          }
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  seg: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segActive: { borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  segActiveText: { color: colors.textPrimary, fontWeight: "700" },
  segInactive: { borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  segInactiveText: { color: colors.textMuted, fontWeight: "600" },
  chatBody: { flex: 1 },
  welcomeOuter: { justifyContent: "space-between" },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  bubbleWrap: { maxWidth: "88%", marginBottom: 10 },
  bubbleWrapUser: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubbleWrapAi: { alignSelf: "flex-start", alignItems: "flex-start" },
  ranklyLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 4 },
  bubble: { paddingVertical: 12, paddingHorizontal: 14 },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUserText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  bubbleAiText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  msgTime: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
  typingRow: { paddingHorizontal: 20, marginBottom: 8 },
  typingBubble: { alignSelf: "flex-start" },
  typingDots: { flexDirection: "row", gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPrimary,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.35 },
  welcomeContainer: { paddingHorizontal: 20, paddingTop: 24 },
  welcomeEmoji: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  starterChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  starterText: { color: colors.textPrimary, fontSize: 15 },
  setupContainer: { paddingHorizontal: 20 },
  setupTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 8,
  },
  ivInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  pillText: { color: colors.textSecondary, textTransform: "capitalize" },
  pillTextOn: { color: colors.textPrimary, fontWeight: "700" },
  startButtonWrap: { marginTop: 24 },
  startBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  startBtnDisabledGrad: { opacity: 0.45 },
  startBtnText: { color: colors.textPrimary, fontWeight: "800", fontSize: 16 },
  liveBody: { flex: 1, paddingHorizontal: 20 },
  progressRow: { marginBottom: 16 },
  progressText: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: colors.accent, borderRadius: 4 },
  questionCard: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  questionText: { color: colors.textPrimary, fontSize: 17, lineHeight: 26 },
  answerInput: {
    minHeight: 120,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 16,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: { color: colors.textPrimary, fontWeight: "600" },
  submitButton: { flex: 1, borderRadius: 14, overflow: "hidden" },
  submitButtonDisabled: { opacity: 0.45 },
  submitGrad: { paddingVertical: 14, alignItems: "center", borderRadius: 14 },
  submitText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
  resultsContent: { paddingHorizontal: 20, paddingTop: 8 },
  resultsHeader: { alignItems: "center", marginBottom: 24 },
  ringWrap: { marginBottom: 12 },
  resultTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  resultSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  questionResult: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  questionResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  questionResultNumber: { color: colors.textMuted, fontWeight: "700" },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  questionResultQuestion: {
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 15,
  },
  questionResultAnswer: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackBox: {
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 10,
  },
  feedbackLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  feedbackText: { color: colors.accent, fontSize: 13, lineHeight: 20 },
  resultsFooter: { marginTop: 8, gap: 12 },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  ghostButton: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  ghostButtonText: { color: colors.textPrimary, fontWeight: "600" },
});
