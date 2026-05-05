import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  Path,
} from "react-native-svg";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { AI_STARTER_PROMPTS } from "../../../constants/content";
import { useAppTheme } from "../../../theme/useAppTheme";
import type { ChatMessage } from "../../../types/common.types";
import { formatTime } from "../../../utils/date";
import { createAIStyles } from "../styles";

function AICoachAvatarIllustration() {
  const theme = useAppTheme();
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
        fill={theme.primary}
        opacity={0.2}
        filter="url(#docBlur)"
      />
      <Circle
        cx={40}
        cy={40}
        r={40}
        fill={theme.surface}
        stroke={theme.border}
        strokeWidth={1}
      />
      <Circle
        cx={40}
        cy={40}
        r={26}
        fill="none"
        stroke={theme.border}
        strokeWidth={1}
        opacity={0.7}
      />
      <Path
        d="M40 22 L44 34 L56 38 L44 42 L40 56 L36 42 L24 38 L36 34 Z"
        fill={theme.primary}
        opacity={0.78}
      />
      <Path
        d="M40 26 L43 35 L52 38 L43 41 L40 50 L37 41 L28 38 L37 35 Z"
        fill={theme.secondary}
        opacity={0.35}
      />
      <Circle cx={58} cy={24} r={3} fill={theme.accent} />
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
  const theme = useAppTheme();
  const styles = createAIStyles(theme);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(index * 80, withTiming(1, { duration: 280 }));
    translateY.value = withDelay(index * 80, withTiming(0, { duration: 280 }));
  }, []);

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
            color={theme.textSecondary}
          />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function MessageBubble({
  item,
  showRanklyLabel,
}: {
  item: ChatMessage;
  showRanklyLabel: boolean;
}) {
  const theme = useAppTheme();
  const styles = createAIStyles(theme);
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
      {!isUser && showRanklyLabel && (
        <View style={styles.aiBubbleHeader}>
          <View style={styles.aiBubbleMark}>
            <Text style={styles.aiBubbleMarkSpark}>✦</Text>
          </View>
          <View style={styles.aiBubbleHeaderTextWrap}>
            <Text style={styles.aiBubbleHeaderText}>Rankly AI</Text>
          </View>
        </View>
      )}
      {isUser ? (
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
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
  const theme = useAppTheme();
  const styles = createAIStyles(theme);
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
  }, []);

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

function InputBar({
  input,
  setInput,
  onSend,
  disabled,
  insetsBottom,
  onFocus,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  insetsBottom: number;
  onFocus?: () => void;
}) {
  const theme = useAppTheme();
  const styles = createAIStyles(theme);
  const canSend = input.trim().length > 0 && !disabled;
  const [focused, setFocused] = useState(false);
  const pressScale = useSharedValue(1);
  const pressAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <View
      style={[
        styles.inputRow,
        { paddingBottom: insetsBottom > 0 ? insetsBottom : 12 },
      ]}
    >
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholder="Ask your career coach..."
        placeholderTextColor={theme.placeholder}
        value={input}
        onChangeText={setInput}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        multiline
      />
      <AnimatedTouchable
        style={[
          styles.sendBtnBase,
          !canSend && styles.sendBtnDisabled,
          pressAnimStyle,
        ]}
        activeOpacity={1}
        onPressIn={() => {
          if (canSend) pressScale.value = withTiming(0.92, { duration: 80 });
        }}
        onPressOut={() => {
          Keyboard.dismiss();
          pressScale.value = withSpring(1, { damping: 20, stiffness: 200 });
        }}
        onPress={onSend}
        disabled={!canSend}
      >
        {canSend && (
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <Ionicons
          name="arrow-forward"
          size={20}
          color={canSend ? theme.onPrimary : theme.textSecondary}
          style={{ transform: [{ rotate: "-90deg" }] }}
        />
      </AnimatedTouchable>
    </View>
  );
}

type ChatTabProps = {
  messages: ChatMessage[];
  loading: boolean;
  ready: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onSendPrompt: (p: string) => void;
  insetsBottom: number;
};

export function ChatTab({
  messages,
  loading,
  ready,
  input,
  setInput,
  onSend,
  onSendPrompt,
  insetsBottom,
}: ChatTabProps) {
  const theme = useAppTheme();
  const styles = createAIStyles(theme);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const prevMessageCountRef = useRef(messages.length);
  const reversed = [...messages].reverse();

  // Handler to scroll to bottom when TextInput is focused
  const handleInputFocus = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Scroll to bottom (offset 0 on inverted list) when keyboard opens
  // so the input bar is always visible regardless of scroll position
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvent, (_e: KeyboardEvent) => {
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const wasNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (wasNewMessage) {
      // Small delay to let layout settle
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {messages.length === 0 ? (
        <View style={[styles.chatBody, styles.chatEmptyOuter]}>
          <View style={styles.chatEmptyWrap}>
            <View style={styles.chatEmptyAvatarGlow}>
              <AICoachAvatarIllustration />
            </View>
            <Text style={styles.chatEmptyTitle}>Your AI Career Coach</Text>
            <Text style={styles.chatEmptySubtitle}>
              Ask me anything about your resume, job search, salary negotiation,
              or interview prep.
            </Text>
            <View style={styles.chatSuggestionList}>
              {AI_STARTER_PROMPTS.map((prompt, idx) => (
                <SuggestionChip
                  key={prompt}
                  prompt={prompt}
                  index={idx}
                  onSend={() => onSendPrompt(prompt)}
                  disabled={loading}
                />
              ))}
            </View>
          </View>

          {loading && <TypingIndicator />}

          <InputBar
            input={input}
            setInput={setInput}
            onSend={onSend}
            disabled={loading}
            insetsBottom={insetsBottom}
            onFocus={handleInputFocus}
          />
        </View>
      ) : (
        <View style={styles.chatBody}>
          <FlatList
            ref={listRef}
            inverted
            data={reversed}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            // Remove onContentSizeChange entirely
            renderItem={({ item, index }) => {
              const older = reversed[index + 1];
              const showRanklyLabel =
                item.role === "assistant" &&
                (!older || older.role !== "assistant");
              return (
                <MessageBubble item={item} showRanklyLabel={showRanklyLabel} />
              );
            }}
          />

          {loading && <TypingIndicator />}

          <InputBar
            input={input}
            setInput={setInput}
            onSend={onSend}
            disabled={loading}
            insetsBottom={0}
            onFocus={handleInputFocus}
          />
        </View>
      )}
    </View>
  );
}