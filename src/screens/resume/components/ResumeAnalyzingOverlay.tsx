import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../theme/color";

const STEPS = [
  "Parsing document structure",
  "Checking keywords & ATS fit",
  "Reviewing format & clarity",
  "Scoring & building report",
];

const STEP_DURATION = 10000;

export function ResumeAnalyzingOverlay({ visible }: { visible: boolean }) {
  const [activeStep, setActiveStep] = React.useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dotAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!visible) {
      setActiveStep(0);
      progressAnim.setValue(0);
      fadeAnim.setValue(0);
      dotAnims.forEach((a) => a.setValue(0));
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    let step = 0;
    const tick = () => {
      if (step >= STEPS.length) return;
      setActiveStep(step);

      // Expand active dot
      dotAnims.forEach((a, i) => {
        Animated.timing(a, {
          toValue: i <= step ? 1 : 0,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });

      Animated.timing(progressAnim, {
        toValue: ((step + 1) / STEPS.length) * 0.88,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();

      step++;
      if (step < STEPS.length) setTimeout(tick, STEP_DURATION);
    };
    tick();
  }, [visible]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <View style={s.card}>
          {/* Icon */}
          <View style={s.iconWrap}>
            <View style={s.iconRing}>
              <Text style={s.docEmoji}>📄</Text>
            </View>
            {/* Rotating arc */}
            <SpinnerRing />
          </View>

          <Text style={s.title}>Analyzing your resume</Text>
          <Text style={s.subtitle}>
            {STEPS[Math.min(activeStep, STEPS.length - 1)]}…
          </Text>

          {/* Pagination dots */}
          <View style={s.dotsRow}>
            {STEPS.map((_, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;

              const dotWidth = dotAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [8, isActive ? 24 : 8],
              });

              const bg = isDone
                ? colors.success
                : isActive
                  ? colors.primary
                  : colors.border;

              return (
                <Animated.View
                  key={i}
                  style={[s.dot, { width: dotWidth, backgroundColor: bg }]}
                />
              );
            })}
          </View>

          {/* Step label rows */}
          <View style={s.stepsWrap}>
            {STEPS.map((label, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;
              return (
                <View key={label} style={s.stepRow}>
                  {/* Left indicator line */}
                  <View
                    style={[
                      s.stepLine,
                      isActive && s.stepLineActive,
                      isDone && s.stepLineDone,
                    ]}
                  />
                  <Text
                    style={[
                      s.stepText,
                      isActive && s.stepTextActive,
                      isDone && s.stepTextDone,
                    ]}
                  >
                    {label}
                  </Text>
                  {isDone && <Text style={s.checkmark}>✓</Text>}
                </View>
              );
            })}
          </View>

          {/* Progress bar */}
          <View style={s.progressBg}>
            <Animated.View style={[s.progressFill, { width: progressWidth }]} />
          </View>

          <Text style={s.progressLabel}>
            Step {Math.min(activeStep + 1, STEPS.length)} of {STEPS.length}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

// Rotating arc ring using Animated
function SpinnerRing() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return <Animated.View style={[s.spinnerRing, { transform: [{ rotate }] }]} />;
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface, // #130F1F
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border, // #2A2440
  },

  // Icon
  iconWrap: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt, // #1C1830
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "transparent",
    borderTopColor: colors.primary, // #8B5CF6
    borderRightColor: colors.primaryLight, // #C4B5FD (fades off)
  },
  docEmoji: {
    fontSize: 26,
  },

  // Text
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary, // #FAF9FF
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary, // #A09ABA
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 18,
  },

  // Pagination dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    height: 8,
    borderRadius: 99,
  },

  // Step rows
  stepsWrap: {
    width: "100%",
    gap: 6,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepLine: {
    width: 3,
    height: 16,
    borderRadius: 99,
    backgroundColor: colors.border,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepLineDone: {
    backgroundColor: colors.success,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted, // #6B6480
  },
  stepTextActive: {
    color: colors.textPrimary,
    fontWeight: "500",
  },
  stepTextDone: {
    color: colors.success,
  },
  checkmark: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "600",
  },

  // Progress
  progressBg: {
    width: "100%",
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 99,
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
});
