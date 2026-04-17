import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createInterviewStyles } from "../Interview.styles";
import type { InterviewPhase } from "../types/interview.types";

interface InterviewInputProps {
  phase: InterviewPhase;
  transcript: string;
  isRecording: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  onTranscriptChange: (text: string) => void;
  onSubmit: (text: string) => void;
  onMicPress: () => void;
  onMicStop: () => void;
}

function InterviewInputComponent({
  phase,
  transcript,
  isRecording,
  isSpeaking,
  isLoading,
  onTranscriptChange,
  onSubmit,
  onMicPress,
  onMicStop,
}: InterviewInputProps) {
  const theme = useAppTheme();
  const s = createInterviewStyles(theme);
  const inputRef = useRef<TextInput>(null);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording, pulseOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const isReady = phase === "ready";
  const canSubmit = isReady && transcript.trim().length > 0 && !isLoading;
  const canRecord = isReady && !isSpeaking && !isLoading;
  const isProcessing = phase === "processing";

  const handleMicPress = useCallback(() => {
    if (isRecording) {
      onMicStop();
    } else if (canRecord) {
      onMicPress();
    }
  }, [isRecording, canRecord, onMicPress, onMicStop]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    onSubmit(transcript.trim());
  }, [canSubmit, transcript, onSubmit]);

  return (
    <View style={s.inputContainer}>
      <TextInput
        ref={inputRef}
        multiline
        editable={isReady || isRecording}
        placeholder="Type your answer here or tap the mic to speak…"
        placeholderTextColor={theme.placeholder}
        value={transcript}
        onChangeText={onTranscriptChange}
        style={[s.answerInput, isRecording && s.answerInputRecording]}
        textAlignVertical="top"
      />

      {isRecording && (
        <View style={s.recordingIndicator}>
          <Animated.View style={[s.recordingDot, dotStyle]} />
          <Text style={s.recordingText}>Recording… tap mic to stop</Text>
        </View>
      )}

      <View style={s.inputActionsRow}>
        <View style={s.inputButtonsRow}>
          <TouchableOpacity
            onPress={handleMicPress}
            disabled={(!canRecord && !isRecording) || isProcessing}
            activeOpacity={0.7}
            style={[
              s.micBtn,
              isRecording && s.micBtnRecording,
              !canRecord && !isRecording && s.micBtnDisabled,
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={20}
                color={isRecording ? theme.danger : canRecord ? theme.primary : theme.textMuted}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={s.submitGrad}
            >
              <Text style={s.submitText}>
                {isProcessing ? "Evaluating…" : "Submit"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export const InterviewInput = memo(InterviewInputComponent);
