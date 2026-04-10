import { Ionicons } from "@expo/vector-icons";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { useVoiceInterview } from "../../hooks/useVoiceInterview";
import { colors } from "../../theme/color";
import type { SessionAnswer } from "../../types/common.types";

interface VoiceInterviewSessionProps {
  questions: string[];
  sessionConfig: {
    role: string;
    difficulty: string;
    sessionType: string;
  };
  voiceInterview: ReturnType<typeof useVoiceInterview>;
  onSessionComplete: (answers: SessionAnswer[]) => void;
  onExit: () => void;
}

export function VoiceInterviewSession({
  questions,
  sessionConfig,
  voiceInterview,
  onSessionComplete,
  onExit,
}: VoiceInterviewSessionProps) {
  const insets = useSafeAreaInsets();
  const {
    phase,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    liveTranscript,
    finalTranscript,
    aiFeedback,
    aiScore,
    errorMessage,
    recordingDuration,
    answers,
    requestPermissionAndStart,
    startRecording,
    stopRecording,
    nextQuestion,
    resetSession,
    openSettings,
    speakCurrentQuestion,
    stopSpeaking,
    handleSpeechStart,
    handleSpeechEnd,
    handleSpeechResult,
    handleSpeechError,
  } = voiceInterview;

  // Component state
  const [showAnswer, setShowAnswer] = useState(true);

  // Memoized values
  const averageScore = useMemo(
    () =>
      answers.length > 0
        ? Math.round(
            answers.reduce((sum, a) => sum + a.score, 0) / answers.length,
          )
        : 0,
    [answers],
  );

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  // Speech recognition event listeners - must be at component level
  useSpeechRecognitionEvent("start", handleSpeechStart);
  useSpeechRecognitionEvent("end", handleSpeechEnd);
  useSpeechRecognitionEvent("result", handleSpeechResult);
  useSpeechRecognitionEvent("error", handleSpeechError);

  // Start session when component mounts
  useEffect(() => {
    if (questions.length > 0 && phase === "idle") {
      requestPermissionAndStart(questions);
    }
  }, [questions, phase]);

  // Animate progress bar
  useEffect(() => {
    const progress =
      totalQuestions > 0
        ? (currentQuestionIndex + 1) / totalQuestions // +1 so Q1 shows some fill
        : 0;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentQuestionIndex, totalQuestions]);

  // Pulse animation for recording
  useEffect(() => {
    if (phase === "recording") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [phase]);

  // Speaking dots animation
  useEffect(() => {
    if (phase === "speaking_question") {
      const animateDots = () => {
        dotsAnim.forEach((dot, index) => {
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(dot, {
              toValue: 1.5,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        });
      };
      const interval = setInterval(animateDots, 1200);
      animateDots();
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Score reveal animation
  useEffect(() => {
    if (phase === "showing_feedback" && aiScore !== null) {
      scoreAnim.setValue(0); // reset before animating
      Animated.spring(scoreAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [phase, aiScore]);

  // Session complete checkmark animation
  useEffect(() => {
    if (phase === "session_complete") {
      Animated.spring(checkmarkAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [phase]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.primary;
    return colors.warning;
  };

  const getSessionMessage = (averageScore: number) => {
    if (averageScore >= 80) return "Outstanding performance! 🔥";
    if (averageScore >= 60) return "Solid effort! Keep practicing 💪";
    return "Good start! Practice makes perfect 🎯";
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backButton} onPress={onExit}>
        <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.headerProgress}>
        Question {currentQuestionIndex + 1} / {totalQuestions}
      </Text>
      <View style={styles.configPill}>
        <Text style={styles.configPillText}>
          {sessionConfig.sessionType.charAt(0).toUpperCase() +
            sessionConfig.sessionType.slice(1)}{" "}
          • {sessionConfig.difficulty}
        </Text>
      </View>
    </View>
  );

  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );

  const renderSpeakerButton = () => {
    const isActive = phase === "speaking_question";
    return (
      <TouchableOpacity
        style={[styles.speakerButton, isActive && styles.speakerButtonActive]}
        onPress={isActive ? stopSpeaking : speakCurrentQuestion}
      >
        <Ionicons
          name="volume-high-outline"
          size={20}
          color={isActive ? colors.textPrimary : colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  const renderRequestingPermission = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.statusText}>Setting up voice interview...</Text>
    </View>
  );

  const renderPermissionDenied = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="mic-off" size={48} color={colors.error} />
      <Text style={styles.errorTitle}>Microphone Access Required</Text>
      <Text style={styles.errorMessage}>
        {errorMessage || "Voice interviews require microphone permission."}
      </Text>
      {errorMessage?.includes("Settings") && (
        <TouchableOpacity style={styles.primaryButton} onPress={openSettings}>
          <Text style={styles.primaryButtonText}>Open Settings</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.secondaryButton} onPress={onExit}>
        <Text style={styles.secondaryButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReadyToRecord = () => (
    <View style={styles.contentContainer}>
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion}</Text>
        <View style={styles.questionActions}>
          {renderSpeakerButton()}
          <View style={styles.speakerLabel}>
            <Text style={styles.speakerLabelText}>Listen</Text>
          </View>
        </View>
      </View>
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.micButton} onPress={startRecording}>
          <Ionicons name="mic" size={32} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.micLabel}>Tap to answer</Text>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => nextQuestion()}
        >
          <Text style={styles.skipButtonText}>Skip this question</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSpeakingQuestion = () => (
    <View style={styles.contentContainer}>
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion}</Text>
        <View style={styles.questionActions}>
          <TouchableOpacity
            style={styles.speakerButtonActive}
            onPress={stopSpeaking}
          >
            <Ionicons name="volume-high" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.speakingIndicator}>
            {dotsAnim.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.speakingDot,
                  {
                    transform: [{ scale: anim }],
                  },
                ]}
              />
            ))}
            <Text style={styles.speakingText}>Speaking...</Text>
            <TouchableOpacity onPress={stopSpeaking}>
              <Text style={styles.stopSpeakingText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const WaveformBars = () => {
    const bars = useRef(
      Array.from({ length: 5 }, () => new Animated.Value(0.3)),
    ).current;

    useEffect(() => {
      const animations = bars.map((bar, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 120),
            Animated.timing(bar, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(bar, {
              toValue: 0.3,
              duration: 350,
              useNativeDriver: true,
            }),
          ]),
        ),
      );
      animations.forEach((a) => a.start());
      return () => animations.forEach((a) => a.stop());
    }, []);

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          height: 32,
        }}
      >
        {bars.map((bar, i) => (
          <Animated.View
            key={i}
            style={{
              width: 4,
              height: 28,
              borderRadius: 2,
              backgroundColor: colors.primary,
              transform: [{ scaleY: bar }],
            }}
          />
        ))}
      </View>
    );
  };

  const renderRecording = () => (
    <View style={styles.contentContainer}>
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion}</Text>
      </View>
      <View style={styles.transcriptCard}>
        <Text style={styles.transcriptText}>
          {liveTranscript || (
            <Text style={styles.listeningText}>Listening...</Text>
          )}
        </Text>
      </View>
      <View style={styles.recordingIndicator}>
        <WaveformBars />
        <Text style={styles.recordingText}>Recording</Text>
        <Text style={styles.timerText}>{recordingDuration}s</Text>
      </View>
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
          <Ionicons name="stop" size={32} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stopLabel}>Tap to stop</Text>
      </View>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.contentContainer}>
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion}</Text>
      </View>
      <View style={[styles.transcriptCard, styles.transcriptCardPurple]}>
        <Text style={styles.transcriptText}>{finalTranscript}</Text>
      </View>
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.processingText}>
          AI is evaluating your answer...
        </Text>
      </View>
    </View>
  );

  const renderFeedback = () => (
    <ScrollView
      style={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Animated.View
        style={[
          styles.scoreContainer,
          {
            transform: [{ scale: scoreAnim }],
          },
        ]}
      >
        <Text
          style={[styles.scoreText, { color: getScoreColor(aiScore || 0) }]}
        >
          {aiScore}
        </Text>
      </Animated.View>

      <View style={styles.collapsibleSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowAnswer((prev: boolean) => !prev)}
        >
          <Text style={styles.sectionTitle}>Your Answer</Text>
          <Ionicons
            name={showAnswer ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        {showAnswer && (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionText}>{finalTranscript}</Text>
          </View>
        )}
      </View>

      <View style={styles.feedbackSection}>
        <Text style={styles.sectionTitle}>Overall</Text>
        <Text style={styles.sectionText}>{aiFeedback?.overall}</Text>
      </View>

      {aiFeedback?.strengths && aiFeedback.strengths.length > 0 && (
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>Strengths</Text>
          {aiFeedback.strengths.map((strength, index) => (
            <View key={index} style={styles.feedbackItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.success}
              />
              <Text style={styles.feedbackItemText}>{strength}</Text>
            </View>
          ))}
        </View>
      )}

      {aiFeedback?.improvements && aiFeedback.improvements.length > 0 && (
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>Improvements</Text>
          {aiFeedback.improvements.map((improvement, index) => (
            <View key={index} style={styles.feedbackItem}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.feedbackItemText}>{improvement}</Text>
            </View>
          ))}
        </View>
      )}

      {aiFeedback?.tip && (
        <View style={[styles.feedbackSection, styles.tipSection]}>
          <Text style={styles.sectionTitle}>Pro Tip</Text>
          <Text style={styles.tipText}>{aiFeedback.tip}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => nextQuestion()}
      >
        <Text style={styles.primaryButtonText}>
          {currentQuestionIndex + 1 >= questions.length
            ? "Finish Session →"
            : "Next Question →"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSessionComplete = () => {
    return (
      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.checkmarkContainer,
            {
              transform: [{ scale: checkmarkAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        </Animated.View>
        <Text style={styles.completionTitle}>Session Complete!</Text>
        <Text
          style={[styles.averageScore, { color: getScoreColor(averageScore) }]}
        >
          {averageScore}
        </Text>

        <ScrollView
          horizontal
          style={styles.scorePillsContainer}
          showsHorizontalScrollIndicator={false}
        >
          {answers.map((answer, index) => (
            <View key={index} style={styles.scorePill}>
              <Text style={styles.scorePillText}>
                Q{index + 1}: {answer.score}
              </Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.motivationalText}>
          {getSessionMessage(averageScore)}
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onSessionComplete(answers)}
        >
          <Text style={styles.primaryButtonText}>View Full Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            resetSession();
            onExit();
          }}
        >
          <Text style={styles.secondaryButtonText}>Start New Session</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="warning" size={48} color={colors.error} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          resetSession();
          requestPermissionAndStart(questions);
        }}
      >
        <Text style={styles.primaryButtonText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onExit}>
        <Text style={styles.secondaryButtonText}>Exit</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (phase) {
      case "requesting_permission":
        return renderRequestingPermission();
      case "permission_denied":
        return renderPermissionDenied();
      case "speaking_question":
        return renderSpeakingQuestion();
      case "ready_to_record":
        return renderReadyToRecord();
      case "recording":
        return renderRecording();
      case "processing":
        return renderProcessing();
      case "showing_feedback":
        return renderFeedback();
      case "session_complete":
        return renderSessionComplete();
      case "error":
        return renderError();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      {renderHeader()}
      {renderProgressBar()}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.content, { paddingBottom: insets.bottom }]}>
          {renderContent()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerProgress: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  configPill: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  configPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressBarTrack: {
    flex: 1,
    height: "100%",
    backgroundColor: colors.border,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 28,
  },
  questionActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 16,
  },
  speakerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  speakerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speakerLabel: {
    alignItems: "center",
  },
  speakerLabelText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  speakingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  speakingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  speakingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  stopSpeakingText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  bottomActions: {
    alignItems: "center",
    marginTop: 32,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  micLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 12,
  },
  skipButton: {
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  transcriptCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    minHeight: 80,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  transcriptCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  transcriptText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  listeningText: {
    fontStyle: "italic",
    color: colors.textMuted,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.error,
  },
  timerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  stopButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 12,
  },
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  processingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scoreContainer: {
    alignSelf: "center",
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -2,
  },
  collapsibleSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionContent: {
    padding: 16,
  },
  sectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  feedbackSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tipSection: {
    backgroundColor: colors.primary + "10",
    borderColor: colors.primary + "30",
    borderWidth: 1,
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  feedbackItemText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  checkmarkContainer: {
    marginBottom: 24,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  averageScore: {
    fontSize: 48,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
  },
  scorePillsContainer: {
    marginBottom: 16,
  },
  scorePill: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  motivationalText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  statusText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
