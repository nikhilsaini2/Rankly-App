import { RouteProp, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InterviewScreen } from "../../feature/interview";
import { useAIChat } from "../../hooks/useAIChat";
import { useProfile } from "../../hooks/useProfile";
import type { RootTabParamList } from "../../types/navigation.types";
import { ChatTab } from "./components/ChatTab";
import { PremiumHeader } from "./components/PremiumHeader";
import { PremiumTabSwitcher } from "./components/PremiumTabSwitcher";
import { styles } from "./styles";

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootTabParamList, "AI">>();
  const atsContext = route.params?.atsContext;
  const initialSegment = route.params?.initialSegment;

  const { user } = useProfile();
  const chat = useAIChat(user);

  const [segment, setSegment] = useState<"chat" | "interview">("chat");
  const [input, setInput] = useState("");

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
  }, []);

  useEffect(() => {
    if (initialSegment) setSegment(initialSegment);
  }, [initialSegment]);

  useEffect(() => {
    contextSentRef.current = false;
  }, [atsContext]);

  useEffect(() => {
    if (
      !atsContext ||
      !chat.ready ||
      contextSentRef.current ||
      chat.messages.length > 0
    )
      return;
    contextSentRef.current = true;
    void chat.send(atsContext).catch(() => {
      contextSentRef.current = false;
    });
  }, [atsContext, chat.ready, chat.messages.length]);

  async function onSendChat() {
    const t = input.trim();
    if (!t || chat.loading) return;
    setInput("");
    await chat.send(t);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={35}
    >
      <Animated.View style={[styles.flex, screenAnim]}>
        <PremiumHeader />
        <PremiumTabSwitcher active={segment} onChange={setSegment} />

        {segment === "chat" ? (
          <ChatTab
            messages={chat.messages}
            loading={chat.loading}
            ready={chat.ready}
            input={input}
            setInput={setInput}
            onSend={onSendChat}
            onSendPrompt={(p) => {
              if (!chat.loading) void chat.send(p);
            }}
            insetsBottom={insets.bottom}
          />
        ) : (
          <InterviewScreen
            defaultRole={user?.role ?? ""}
            onDiscussCoach={() => setSegment("chat")}
            insetsBottom={insets.bottom}
          />
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
