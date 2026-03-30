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
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  Path,
} from "react-native-svg";
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
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });
  }, [item.id]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        styles.bubbleWrap,
        isUser ? styles.bubbleWrapUser : styles.bubbleWrapAi,
      ]}
    >
      {!isUser && showRanklyLabel ? (
        <View style={styles.aiBubbleHeader}>
          <View style={styles.aiBubbleMark}>
            <Text style={styles.aiBubbleMarkSpark}>✦</Text>
          </View>
          <View style={styles.aiBubbleHeaderTextWrap}>
            <Text style={styles.aiBubbleHeaderText}>Rankly AI</Text>
          </View>
        </View>
      ) : null}

      {isUser ? (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.userBubbleGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.userBubbleText}>{item.content}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.aiBubbleSurface}>
          <Text style={styles.aiBubbleText}>{item.content}</Text>
        </View>
      )}

      <Text style={[styles.msgTime, isUser && styles.msgTimeRight]}>
        {item.createdAt ? formatTime(item.createdAt) : ""}
      </Text>
    </Animated.View>
  );
}

function TypingIndicator() {
  const y1 = useSharedValue(0);
  const y2 = useSharedValue(0);
  const y3 = useSharedValue(0);

  useEffect(() => {
    const bounce = withSequence(
      withTiming(-5, { duration: 300 }),
      withTiming(0, { duration: 300 }),
    );

    y1.value = withRepeat(bounce, -1, false);
    y2.value = withDelay(150, withRepeat(bounce, -1, false));
    y3.value = withDelay(300, withRepeat(bounce, -1, false));
  }, [y1, y2, y3]);

  const s1 = useAnimatedStyle(() => ({
    transform: [{ translateY: y1.value }],
  }));
  const s2 = useAnimatedStyle(() => ({
    transform: [{ translateY: y2.value }],
  }));
  const s3 = useAnimatedStyle(() => ({
    transform: [{ translateY: y3.value }],
  }));

  return (
    <View style={styles.typingRow}>
      <View style={[styles.aiBubbleSurface, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.dot, s1]} />
          <Animated.View style={[styles.dot, s2]} />
          <Animated.View style={[styles.dot, s3]} />
        </View>
      </View>
    </View>
  );
}

function StatusPulseDot() {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.8, { duration: 1800 }),
      -1,
      true,
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 1800 }),
      -1,
      true,
    );
  }, [pulseScale, pulseOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.statusDotWrap}>
      <Animated.View style={[styles.statusDotRing, ringStyle]} />
      <View style={styles.statusDotInner} />
    </View>
  );
}

function PremiumHeader() {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerTitleRow}>
          <StatusPulseDot />
          <Text style={styles.headerTitle}>AI Coach</Text>
        </View>

        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => {
            // no-op for now (visual affordance only)
          }}
          accessibilityRole="button"
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.headerSubtitle}>
        <Text style={styles.headerSubtitleSpark}>✦</Text> Powered by Gemini
      </Text>
    </View>
  );
}

function PremiumTabSwitcher({
  active,
  onChange,
}: {
  active: "chat" | "interview";
  onChange: (v: "chat" | "interview") => void;
}) {
  const indicatorX = useSharedValue(active === "chat" ? 0 : 1);
  const [tabWidth, setTabWidth] = useState(0);

  useEffect(() => {
    indicatorX.value = withSpring(active === "chat" ? 0 : 1, {
      damping: 20,
      stiffness: 200,
    });
  }, [active, indicatorX]);

  const half = tabWidth / 2;

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * half }],
  }));

  return (
    <View
      style={styles.tabOuter}
      onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
    >
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChange("chat")}
        accessibilityRole="button"
      >
        {active === "chat" ? (
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={16}
            color={colors.primary}
            style={{ marginBottom: 2 }}
          />
        ) : null}
        <Text
          style={[
            styles.tabText,
            active === "chat" ? styles.tabTextActive : styles.tabTextMuted,
          ]}
        >
          Chat
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChange("interview")}
        accessibilityRole="button"
      >
        {active === "interview" ? (
          <Ionicons
            name="mic-outline"
            size={16}
            color={colors.primary}
            style={{ marginBottom: 2 }}
          />
        ) : null}
        <Text
          style={[
            styles.tabText,
            active === "interview" ? styles.tabTextActive : styles.tabTextMuted,
          ]}
        >
          Interview
        </Text>
      </TouchableOpacity>

      {half > 0 ? (
        <View style={styles.tabUnderlineTrack} pointerEvents="none">
          <Animated.View
            style={[styles.tabUnderline, underlineStyle, { width: half }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

function AICoachAvatarIllustration() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80">
      <Defs>
        <Filter id="docBlur">
          <FeGaussianBlur stdDeviation={2.5} />
        </Filter>
      </Defs>

      <Ellipse
        cx={40}
        cy={72}
        rx={22}
        ry={6}
        fill={colors.primary}
        opacity={0.2}
        filter="url(#docBlur)"
      />

      <Circle
        cx={40}
        cy={40}
        r={40}
        fill={colors.surface}
        stroke={colors.border}
        strokeWidth={1}
      />

      {/* inner ring */}
      <Circle
        cx={40}
        cy={40}
        r={26}
        fill="none"
        stroke={colors.border}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* premium spark mark */}
      <Path
        d="M40 22 L44 34 L56 38 L44 42 L40 56 L36 42 L24 38 L36 34 Z"
        fill={colors.primary}
        opacity={0.78}
      />
      <Path
        d="M40 26 L43 35 L52 38 L43 41 L40 50 L37 41 L28 38 L37 35 Z"
        fill={colors.secondary}
        opacity={0.35}
      />

      {/* orbit dot */}
        <Circle cx={58} cy={24} r={3} fill={colors.accent} />
    </Svg>
  );
}

function SuggestionChip({
  prompt,
  index,
  onSend,
  disabled,
}: {
  prompt: string;
  index: number;
  onSend: () => void;
  disabled: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 280 }));
    translateY.value = withDelay(index * 80, withTiming(0, { duration: 280 }));
  }, [index, opacity, translateY]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={aStyle}>
      <PressableScale
        style={styles.suggestionChip}
        onPress={onSend}
        disabled={disabled}
      >
        <View style={styles.suggestionChipInner}>
          <Text style={styles.suggestionChipSpark}>✦</Text>
          <Text style={styles.suggestionChipText} numberOfLines={1}>
            {prompt}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.textSecondary}
          />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

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

  const AnimatedTouchableOpacity =
    Animated.createAnimatedComponent(TouchableOpacity);

  const displayLabel =
    label.length > 0 && isNaN(Number(label))
      ? label.charAt(0).toUpperCase() + label.slice(1)
      : label;

  return (
    <AnimatedTouchableOpacity
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
      {selected ? (
        <Ionicons
          name="checkmark"
          size={12}
          color={
            tone === "easy"
              ? colors.accent
              : tone === "medium"
                ? colors.warning
                : tone === "hard"
                  ? colors.danger
                  : colors.primary
          }
          style={{ marginRight: 6 }}
        />
      ) : null}
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
    </AnimatedTouchableOpacity>
  );
}

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
        <PremiumHeader />
        <PremiumTabSwitcher active={segment} onChange={setSegment} />

        {segment === "chat" ? (
          !chat.ready ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : chat.messages.length === 0 ? (
            <View style={[styles.chatBody, styles.chatEmptyOuter]}>
              <View style={styles.chatEmptyWrap}>
                <View style={styles.chatEmptyAvatarGlow}>
                  <AICoachAvatarIllustration />
                </View>
                <Text style={styles.chatEmptyTitle}>Your AI Career Coach</Text>
                <Text style={styles.chatEmptySubtitle}>
                  Ask me anything about your resume, job search, salary
                  negotiation, or interview prep.
                </Text>

                <View style={styles.chatSuggestionList}>
                  {AI_STARTER_PROMPTS.map((prompt, idx) => (
                    <SuggestionChip
                      key={prompt}
                      prompt={prompt}
                      index={idx}
                      onSend={() => {
                        if (!chat.loading) void chat.send(prompt);
                      }}
                      disabled={chat.loading}
                    />
                  ))}
                </View>
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
  const [focused, setFocused] = useState(false);

  const pressScale = useSharedValue(1);
  const pressAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const AnimatedTouchableOpacity =
    Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <View style={[styles.inputRow, { paddingBottom: 12 + insetsBottom }]}>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholder="Ask your career coach..."
        placeholderTextColor={colors.textMuted}
        value={input}
        onChangeText={setInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
      />
      <AnimatedTouchableOpacity
        style={[
          styles.sendBtnBase,
          !canSend && styles.sendBtnDisabled,
          pressAnimStyle,
        ]}
        activeOpacity={1}
        onPressIn={() => {
          if (!canSend) return;
          pressScale.value = withTiming(0.92, { duration: 80 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 20, stiffness: 200 });
        }}
        onPress={onSend}
        disabled={!canSend}
      >
        {canSend ? (
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <Ionicons
          name="arrow-forward"
          size={20}
          color={canSend ? colors.textPrimary : colors.textSecondary}
          style={{ transform: [{ rotate: "-90deg" }] }}
        />
      </AnimatedTouchableOpacity>
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
  const [roleFocused, setRoleFocused] = useState(false);
  const [answerFocused, setAnswerFocused] = useState(false);

  const card0Opacity = useSharedValue(0);
  const card0Y = useSharedValue(10);
  const card1Opacity = useSharedValue(0);
  const card1Y = useSharedValue(10);
  const card2Opacity = useSharedValue(0);
  const card2Y = useSharedValue(10);
  const card3Opacity = useSharedValue(0);
  const card3Y = useSharedValue(10);

  useEffect(() => {
    if (iv.phase !== "setup") return;

    const duration = 280;
    const stagger = 60;

    const apply = (
      op: typeof card0Opacity,
      y: typeof card0Y,
      i: number,
    ) => {
      op.value = withDelay(i * stagger, withTiming(1, { duration }));
      y.value = withDelay(i * stagger, withTiming(0, { duration }));
    };

    // reset
    card0Opacity.value = 0;
    card0Y.value = 10;
    card1Opacity.value = 0;
    card1Y.value = 10;
    card2Opacity.value = 0;
    card2Y.value = 10;
    card3Opacity.value = 0;
    card3Y.value = 10;

    apply(card0Opacity, card0Y, 0);
    apply(card1Opacity, card1Y, 1);
    apply(card2Opacity, card2Y, 2);
    apply(card3Opacity, card3Y, 3);
  }, [iv.phase]);

  const card0Style = useAnimatedStyle(() => ({
    opacity: card0Opacity.value,
    transform: [{ translateY: card0Y.value }],
  }));
  const card1Style = useAnimatedStyle(() => ({
    opacity: card1Opacity.value,
    transform: [{ translateY: card1Y.value }],
  }));
  const card2Style = useAnimatedStyle(() => ({
    opacity: card2Opacity.value,
    transform: [{ translateY: card2Y.value }],
  }));
  const card3Style = useAnimatedStyle(() => ({
    opacity: card3Opacity.value,
    transform: [{ translateY: card3Y.value }],
  }));

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

        <Animated.View style={[styles.setupCard, card0Style]}>
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

        <Animated.View style={[styles.setupCard, card1Style]}>
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

        <Animated.View style={[styles.setupCard, card2Style]}>
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

        <Animated.View style={[styles.setupCard, card3Style]}>
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

        <PressableScale
          style={styles.startButtonWrap}
          onPress={() =>
            iv.startSession(setupRole, difficulty, sessionType, numQ)
          }
          disabled={iv.busy || !setupRole.trim()}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={[
              styles.startBtn,
              (iv.busy || !setupRole.trim()) && styles.startBtnDisabledGrad,
            ]}
          >
            {iv.busy ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <View style={styles.startBtnRow}>
                <Ionicons
                  name="play"
                  size={18}
                  color={colors.textPrimary}
                />
                <Text style={styles.startBtnText}>Start Session</Text>
              </View>
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
    const diffLabel =
      diff.charAt(0).toUpperCase() + diff.slice(1);
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.liveBody, { paddingBottom: 24 + insetsBottom }]}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Question {iv.index + 1} of {iv.questions.length}
            </Text>
            <TouchableOpacity style={styles.endBtn} onPress={() => {}}>
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressTrack}>
            {progressWidth > 0 ? (
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                style={[styles.progressFillGrad, { width: `${progressWidth}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            ) : null}
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
            style={[styles.answerInput, answerFocused && styles.answerInputFocused]}
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
  headerWrap: { paddingHorizontal: 20, paddingTop: 8, marginBottom: 10 },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  headerSubtitleSpark: { color: colors.primary, fontWeight: "700" },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  statusDotWrap: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  statusDotRing: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  statusDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },

  tabOuter: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 14 },
  tabTextActive: { color: colors.textPrimary, fontWeight: "600" },
  tabTextMuted: { color: colors.textSecondary, fontWeight: "400" },
  tabUnderlineTrack: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 2,
    borderRadius: 2,
    overflow: "hidden",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 2,
    borderRadius: 2,
    overflow: "hidden",
  },

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
  bubbleWrap: { marginBottom: 10 },
  bubbleWrapUser: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    maxWidth: "75%",
  },
  bubbleWrapAi: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
    maxWidth: "85%",
  },
  ranklyLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 4 },
  bubble: { paddingVertical: 12, paddingHorizontal: 14 },
  msgTime: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
  msgTimeRight: { textAlign: "right" },

  aiBubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  aiBubbleMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBubbleMarkSpark: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  aiBubbleHeaderTextWrap: { flex: 1 },
  aiBubbleHeaderText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  userBubbleGrad: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    overflow: "hidden",
  },

  aiBubbleSurface: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBubbleText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
  },
  aiBubbleText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
  },
  typingRow: { paddingHorizontal: 20, marginBottom: 8 },
  typingBubble: { alignSelf: "flex-start", maxWidth: "85%" },
  typingDots: { flexDirection: "row", gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  inputFocused: { borderColor: colors.primary },

  sendBtnBase: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    opacity: 1,
  },

  chatEmptyOuter: { flex: 1, justifyContent: "space-between" },
  chatEmptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  chatEmptyAvatarGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  chatEmptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: 18,
  },
  chatEmptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
    maxWidth: 260,
  },
  chatSuggestionList: { width: "100%", marginTop: 18 },
  suggestionChip: {
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  suggestionChipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionChipSpark: {
    color: colors.primary,
    fontSize: 14,
    width: 18,
    textAlign: "center",
    fontWeight: "700",
  },
  suggestionChipText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
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
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 0,
    marginBottom: 10,
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
  ivInputFocused: { borderColor: colors.primary },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pillBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  pillOff: { backgroundColor: "transparent", borderColor: colors.border },
  pillSelectedPrimary: {
    backgroundColor: "rgba(108,99,255,0.15)",
    borderColor: colors.primary,
  },
  pillSelectedEasy: {
    backgroundColor: "rgba(0,212,170,0.15)",
    borderColor: colors.accent,
  },
  pillSelectedMedium: {
    backgroundColor: "rgba(255,179,71,0.15)",
    borderColor: colors.warning,
  },
  pillSelectedHard: {
    backgroundColor: "rgba(255,92,92,0.15)",
    borderColor: colors.danger,
  },
  pillTextBase: {
    fontSize: 12,
    fontWeight: "400",
    textTransform: "capitalize",
  },
  pillTextMuted: { color: colors.textSecondary, fontWeight: "400" },
  pillTextPrimary: { color: colors.primary, fontWeight: "600" },
  pillTextEasy: { color: colors.accent, fontWeight: "600" },
  pillTextMedium: { color: colors.warning, fontWeight: "600" },
  pillTextHard: { color: colors.danger, fontWeight: "600" },
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
  setupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  startButtonWrap: { marginTop: 24, width: "100%" },
  startBtnRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  startBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnDisabledGrad: { opacity: 0.4 },
  startBtnText: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
  liveBody: { flex: 1, paddingHorizontal: 20 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  progressText: { color: colors.textSecondary, fontSize: 13 },
  endBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  endBtnText: { color: colors.textSecondary, fontWeight: "600", fontSize: 12 },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFillGrad: { height: 3, borderRadius: 2 },
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
    paddingLeft: 22,
    overflow: "hidden",
    position: "relative",
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 26,
  },
  questionAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  metaChipPrimary: {
    backgroundColor: "rgba(108,99,255,0.15)",
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaChip: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaChipTextPrimary: { color: colors.primary, fontWeight: "600", fontSize: 11 },
  metaChipText: { fontWeight: "600", fontSize: 11 },
  answerInput: {
    minHeight: 120,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 16,
    maxHeight: 200,
  },
  answerInputFocused: { borderColor: colors.primary },
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
