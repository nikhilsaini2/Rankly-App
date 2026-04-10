import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
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
  } = voiceInterview;

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Start session when component mounts
  useEffect(() => {
    if (questions.length > 0 && phase === "idle") {
      requestPermissionAndStart(questions);
    }
  }, [questions, phase]);

  // Animate progress bar
  useEffect(() => {
    const progress =
      totalQuestions > 0 ? currentQuestionIndex / totalQuestions : 0;
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
            toValue: 1.2,
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
      Animated.spring(scoreAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [phase, aiScore]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.primary;
    return colors.warning;
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </Text>
    </View>
  );

  const renderRequestingPermission = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.statusText}>Requesting microphone access...</Text>
    </View>
  );

  const renderPermissionDenied = () => (
    <View style={styles.centerContainer}>
      <View style={styles.errorIcon}>
        <Ionicons name="mic-off" size={48} color={colors.error} />
      </View>
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

  const renderSpeakingQuestion = () => (
    <View style={styles.questionContainer}>
      {renderProgressBar()}
      <View style={styles.questionPill}>
        <Text style={styles.questionPillText}>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </Text>
      </View>
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion}</Text>
      </View>
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
      </View>
    </View>
  );

  const renderReadyToRecord = () => (
    <View style={styles.questionContainer}>
      {renderProgressBar()}
      <View style={styles.questionPill}>
        <Text style={styles.questionPillText}>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </Text>
      </View>
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion}</Text>
      </View>
      <TouchableOpacity style={styles.micButton} onPress={startRecording}>
        <Ionicons name="mic" size={32} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.helperText}>Tap the microphone to answer</Text>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => nextQuestion()}
      >
        <Text style={styles.skipButtonText}>Skip question</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecording = () => (
    <View style={styles.recordingContainer}>
      {renderProgressBar()}
      <View style={styles.recordingQuestionCard}>
        <Text style={styles.recordingQuestionText}>{currentQuestion}</Text>
      </View>
      <View style={styles.transcriptContainer}>
        <Text style={styles.transcriptText}>
          {liveTranscript || "Listening..."}
        </Text>
      </View>
      <View style={styles.recordingIndicator}>
        <Animated.View
          style={[
            styles.recordingDot,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Text style={styles.recordingText}>Recording</Text>
        <Text style={styles.timerText}>{recordingDuration}s</Text>
      </View>
      <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
        <Ionicons
          name="stop-circle-outline"
          size={32}
          color={colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.questionContainer}>
      {renderProgressBar()}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion}</Text>
      </View>
      <View style={styles.transcriptContainer}>
        <Text style={styles.transcriptText}>{finalTranscript}</Text>
      </View>
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.processingText}>Evaluating your answer...</Text>
      </View>
    </View>
  );

  const renderFeedback = () => (
    <ScrollView
      style={styles.feedbackContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {renderProgressBar()}
      <View style={styles.feedbackQuestionCard}>
        <Text style={styles.feedbackQuestionText}>{currentQuestion}</Text>
      </View>

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
          {aiScore}/100
        </Text>
      </Animated.View>

      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackSectionTitle}>Overall Assessment</Text>
        <Text style={styles.feedbackText}>{aiFeedback?.overall}</Text>
      </View>

      {aiFeedback?.strengths && aiFeedback.strengths.length > 0 && (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackSectionTitle}>Strengths</Text>
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
          <Text style={styles.feedbackSectionTitle}>Areas to Improve</Text>
          {aiFeedback.improvements.map((improvement, index) => (
            <View key={index} style={styles.feedbackItem}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.feedbackItemText}>{improvement}</Text>
            </View>
          ))}
        </View>
      )}

      {aiFeedback?.tip && (
        <View style={styles.tipSection}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
          <Text style={styles.tipText}>{aiFeedback.tip}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => nextQuestion()}
      >
        <Text style={styles.primaryButtonText}>
          {currentQuestionIndex + 1 >= questions.length
            ? "Finish Session"
            : "Next Question"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSessionComplete = () => {
    const averageScore =
      answers.length > 0
        ? Math.round(
            answers.reduce((sum, a) => sum + a.score, 0) / answers.length,
          )
        : 0;

    return (
      <View style={styles.completionContainer}>
        <Animated.View
          style={[
            styles.checkmarkContainer,
            {
              transform: [{ scale: scoreAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </Animated.View>
        <Text style={styles.completionTitle}>Session Complete!</Text>
        <Text style={styles.completionSubtitle}>
          Overall Score: {averageScore}/100
        </Text>

        <View style={styles.answersSummary}>
          <Text style={styles.summaryTitle}>Answer Summary:</Text>
          {answers.map((answer, index) => (
            <View key={index} style={styles.answerSummaryItem}>
              <Text style={styles.answerSummaryQuestion}>
                Q{index + 1}: {answer.score}/100
              </Text>
            </View>
          ))}
        </View>

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
      <View style={styles.errorIcon}>
        <Ionicons name="warning" size={48} color={colors.error} />
      </View>
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
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
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
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  questionPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  speakingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 40,
  },
  speakingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  speakingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 40,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  skipButton: {
    alignSelf: "center",
    marginTop: 16,
    padding: 8,
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    opacity: 0.6,
  },
  recordingContainer: {
    flex: 1,
    padding: 20,
  },
  recordingQuestionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  recordingQuestionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  transcriptContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.primary + "30",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    marginBottom: 16,
  },
  transcriptText: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
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
    color: colors.error,
    fontSize: 14,
    fontWeight: "600",
  },
  timerText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 40,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  processingContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  processingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  feedbackContainer: {
    flex: 1,
    padding: 20,
  },
  feedbackQuestionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  feedbackQuestionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  scoreContainer: {
    alignSelf: "center",
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "800",
  },
  feedbackSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  feedbackSectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  feedbackText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  feedbackItemText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  tipSection: {
    backgroundColor: colors.primary + "10",
    borderColor: colors.primary + "30",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  tipTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  completionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  checkmarkContainer: {
    marginBottom: 24,
  },
  completionTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  completionSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 32,
  },
  answersSummary: {
    width: "100%",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  answerSummaryItem: {
    marginBottom: 8,
  },
  answerSummaryQuestion: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    minWidth: 200,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 200,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
});
