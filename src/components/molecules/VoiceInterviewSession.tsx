import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  onBack?: () => void;
  onSkip?: () => void;
  onListen?: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  isRecording?: boolean;
  liveTranscript?: string;
  currentQuestion?: string;
  currentQuestionIndex?: number;
  totalQuestions?: number;
  sessionType?: string;
  difficulty?: string;
}

export function VoiceInterviewSession({
  questions,
  sessionConfig,
  voiceInterview,
  onSessionComplete,
  onExit,
  onBack = onExit,
  onSkip,
  onListen,
  onStartRecording,
  onStopRecording,
  isRecording,
  liveTranscript: liveTranscriptProp,
  currentQuestion: currentQuestionProp,
  currentQuestionIndex: currentQuestionIndexProp,
  totalQuestions: totalQuestionsProp,
  sessionType: sessionTypeProp,
  difficulty: difficultyProp,
}: VoiceInterviewSessionProps) {
  const insets = useSafeAreaInsets();
  const {
    phase,
    currentQuestion: hookCurrentQuestion,
    currentQuestionIndex: hookCurrentQuestionIndex,
    totalQuestions: hookTotalQuestions,
    liveTranscript: hookLiveTranscript,
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

  // Resolve values from props or hook - use ?? for numeric/boolean to handle falsy values correctly
  const resolvedCurrentQuestion = currentQuestionProp ?? hookCurrentQuestion;
  const resolvedCurrentQuestionIndex =
    currentQuestionIndexProp ?? hookCurrentQuestionIndex;
  const resolvedTotalQuestions = totalQuestionsProp ?? hookTotalQuestions;
  const resolvedLiveTranscript = liveTranscriptProp ?? hookLiveTranscript;
  const resolvedSessionType = sessionTypeProp ?? sessionConfig.sessionType;
  const resolvedDifficulty = difficultyProp ?? sessionConfig.difficulty;
  const resolvedIsRecording =
    isRecording !== undefined ? isRecording : phase === "recording";

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
  const outerRingAnim = useRef(new Animated.Value(0.06)).current; // New animation for ready_to_record

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
      resolvedTotalQuestions > 0
        ? (resolvedCurrentQuestionIndex + 1) / resolvedTotalQuestions // +1 so Q1 shows some fill
        : 0;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [resolvedCurrentQuestionIndex, resolvedTotalQuestions]);

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

  // Outer ring pulse animation for ready_to_record
  useEffect(() => {
    if (phase === "ready_to_record") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(outerRingAnim, {
            toValue: 0.15,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(outerRingAnim, {
            toValue: 0.06,
            duration: 2000,
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
    if (averageScore >= 80) return "Outstanding performance! \ud83d\udd25";
    if (averageScore >= 60) return "Solid effort! Keep practicing \ud83d\udcaa";
    return "Good start! Practice makes perfect \ud83c\udfaf";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: 8 }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerProgress}>
        Question {resolvedCurrentQuestionIndex + 1} / {resolvedTotalQuestions}
      </Text>
      <View style={styles.configPill}>
        <Text style={styles.configPillText}>
          {resolvedSessionType} · {resolvedDifficulty}
        </Text>
      </View>
    </View>
  );

  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
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
      <View style={styles.waveformContainer}>
        {bars.map((bar, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveformBar,
              {
                transform: [{ scaleY: bar }],
                backgroundColor:
                  phase === "recording" ? colors.danger : colors.primary,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderRequestingPermission = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.setupTitle}>Setting up voice interview...</Text>
      <Text style={styles.setupSubtitle}>
        We need access to your microphone to record your answers
      </Text>
    </View>
  );

  const renderPermissionDenied = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="mic-off" size={64} color={colors.error} />
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
    <View style={styles.fullScreenCenter}>
      <View style={styles.purpleGlow}>
        <WaveformBars />
      </View>
      <View style={styles.questionCardLarge}>
        <Text style={styles.questionTextLarge}>{resolvedCurrentQuestion}</Text>
      </View>
      <Text style={styles.readingStatus}>Reading question aloud...</Text>
      <TouchableOpacity style={styles.skipAudioButton} onPress={stopSpeaking}>
        <Text style={styles.skipAudioText}>Tap to skip audio</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReadyToRecord = () => (
    <View style={styles.fullScreenCenter}>
      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <View style={styles.questionBadge}>
            <Text style={styles.questionBadgeText}>
              Q{resolvedCurrentQuestionIndex + 1}
            </Text>
          </View>
          <Text style={styles.questionLabel}>INTERVIEW QUESTION</Text>
        </View>
        <Text style={styles.questionText}>{resolvedCurrentQuestion}</Text>
      </View>

      <TouchableOpacity
        style={styles.listenButton}
        onPress={onListen || speakCurrentQuestion || (() => {})}
      >
        <Ionicons
          name="volume-medium-outline"
          size={16}
          color={colors.secondary}
        />
        <Text style={styles.listenButtonText}>Listen again</Text>
      </TouchableOpacity>

      <View style={styles.micContainer}>
        {/* Outer glow ring */}
        <Animated.View style={[styles.outerRing, { opacity: outerRingAnim }]}>
          {/* Middle ring */}
          <View style={styles.middleRing}>
            {/* Mic button */}
            <TouchableOpacity
              style={styles.micButton}
              onPress={onStartRecording || startRecording}
            >
              <Ionicons name="mic" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.micLabelText}>Tap to answer</Text>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip || (() => nextQuestion())}
        >
          <Text style={styles.skipButtonText}>Skip this question</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecording = () => (
    <View style={styles.fullScreenCenter}>
      <View style={styles.compactQuestionCard}>
        <View style={styles.recordingHeader}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingBadge}>REC</Text>
        </View>
        <Text style={styles.compactQuestionText}>
          {resolvedCurrentQuestion}
        </Text>
      </View>

      <View style={styles.recordingMicContainer}>
        <Animated.View
          style={[
            styles.recordingMicButton,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <TouchableOpacity onPress={onStopRecording || stopRecording}>
            <Ionicons name="stop" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.recordingStatus}>Tap to stop recording</Text>
      </View>

      <View style={styles.transcriptContainer}>
        <Text style={styles.transcriptLabel}>Live Transcript</Text>
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptText}>
            {resolvedLiveTranscript || (
              <View style={styles.listeningContainer}>
                {dotsAnim.map((anim, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.listeningDot,
                      {
                        transform: [{ scale: anim }],
                      },
                    ]}
                  />
                ))}
                <Text style={styles.listeningText}>Listening...</Text>
              </View>
            )}
          </Text>
        </View>
        <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
      </View>

      <WaveformBars />
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.fullScreenCenter}>
      <View style={styles.processingGlow}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <Text style={styles.processingTitle}>Evaluating your answer...</Text>
      <Text style={styles.processingSubtitle}>
        AI is analyzing your response
      </Text>

      <View style={styles.answerPreview}>
        <Text style={styles.answerPreviewLabel}>Your answer:</Text>
        <Text style={styles.answerPreviewText} numberOfLines={3}>
          {finalTranscript}
        </Text>
      </View>
    </View>
  );

  const renderFeedback = () => (
    <ScrollView
      style={styles.feedbackContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* Score reveal */}
      <Animated.View
        style={[
          styles.scoreRevealContainer,
          {
            transform: [{ scale: scoreAnim }],
          },
        ]}
      >
        <View style={styles.scoreRing}>
          <Text
            style={[styles.scoreNumber, { color: getScoreColor(aiScore || 0) }]}
          >
            {aiScore}
          </Text>
        </View>
        <Text style={styles.scoreMessage}>
          {aiScore && aiScore >= 80
            ? "Great!"
            : aiScore && aiScore >= 60
              ? "Good!"
              : "Keep practicing"}
        </Text>
      </Animated.View>

      {/* Overall feedback */}
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackCardTitle}>Overall</Text>
        <Text style={styles.feedbackCardText}>{aiFeedback?.overall}</Text>
      </View>

      {/* Strengths */}
      {aiFeedback?.strengths && aiFeedback.strengths.length > 0 && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackCardTitle}>Strengths</Text>
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

      {/* Improvements */}
      {aiFeedback?.improvements && aiFeedback.improvements.length > 0 && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackCardTitle}>Improvements</Text>
          {aiFeedback.improvements.map((improvement, index) => (
            <View key={index} style={styles.feedbackItem}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.feedbackItemText}>{improvement}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Pro tip */}
      {aiFeedback?.tip && (
        <View style={styles.tipCard}>
          <Text style={styles.feedbackCardTitle}>Pro Tip</Text>
          <Text style={styles.tipText}>{aiFeedback.tip}</Text>
        </View>
      )}

      {/* Collapsible answer */}
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

      {/* Next/Finish button */}
      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => nextQuestion()}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.nextButtonGradient}
        >
          <Text style={styles.nextButtonText}>
            {resolvedCurrentQuestionIndex + 1 >= questions.length
              ? "Finish Session ->"
              : "Next Question ->"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSessionComplete = () => (
    <View style={styles.fullScreenCenter}>
      <Animated.View
        style={[
          styles.checkmarkContainer,
          {
            transform: [{ scale: checkmarkAnim }],
          },
        ]}
      >
        <View style={styles.checkmarkGlow}>
          <Ionicons name="checkmark-circle" size={88} color={colors.success} />
        </View>
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
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>View Full Report</Text>
        </LinearGradient>
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

  const renderError = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="warning" size={64} color={colors.error} />
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {renderHeader()}
      {renderProgressBar()}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  // Header and Progress
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerProgress: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  configPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  configPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Layout containers
  fullScreenCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // Speaking question phase
  purpleGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  questionCardLarge: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  questionTextLarge: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 26,
    textAlign: "center",
  },
  readingStatus: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  skipAudioButton: {
    padding: 8,
  },
  skipAudioText: {
    color: colors.textMuted,
    fontSize: 13,
  },

  // Ready to record phase
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  questionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  questionBadgeText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  questionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 26,
  },
  listenButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  listenButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  micContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  outerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  middleRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  micLabelText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
  },
  skipButton: {
    marginTop: 10,
    padding: 8,
  },
  skipButtonText: {
    color: colors.textMuted,
    fontSize: 13,
  },

  // Recording phase
  compactQuestionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
  },
  recordingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginRight: 8,
  },
  recordingBadge: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "600",
  },
  compactQuestionText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  recordingMicContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  recordingMicButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  recordingStatus: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
  },
  transcriptContainer: {
    alignSelf: "stretch",
    marginBottom: 24,
  },
  transcriptLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  transcriptBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  transcriptText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  listeningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listeningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  listeningText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
  timerText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
  },
  waveformBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
  },

  // Processing phase
  processingGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  processingTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  processingSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  answerPreview: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  answerPreviewLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  answerPreviewText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },

  // Feedback phase
  feedbackContainer: {
    flex: 1,
  },
  scoreRevealContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: "800",
  },
  scoreMessage: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  feedbackCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  feedbackCardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  feedbackCardText: {
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
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: "rgba(139, 92, 246, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
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
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  sectionContent: {
    padding: 16,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  nextButton: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  nextButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  // Session complete
  checkmarkContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  checkmarkGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  completionTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "700",
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  motivationalText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },

  // Error and setup states
  setupTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
  setupSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },

  // Buttons
  primaryButton: {
    marginBottom: 12,
  },
  primaryButtonGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
});
