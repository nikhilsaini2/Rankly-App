import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../theme/color";

const STEPS = [
  "Parsing document structure",
  "Checking keywords & ATS fit",
  "Reviewing format & clarity",
  "Scoring & building report",
];

const STEP_DURATION = 2000;

export function ResumeAnalyzingOverlay({ visible }: { visible: boolean }) {
  const [activeStep, setActiveStep] = React.useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const stepperRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (stepperRef.current) clearTimeout(stepperRef.current);
    spinLoop.current?.stop();

    if (!visible) {
      setActiveStep(0);
      progressAnim.setValue(0);
      fadeAnim.setValue(0);
      spinAnim.setValue(0);
      return;
    }

    setActiveStep(0);
    progressAnim.setValue(0);
    spinAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoop.current.start();

    let step = 0;
    const tick = () => {
      if (step >= STEPS.length) return;
      setActiveStep(step);
      Animated.timing(progressAnim, {
        toValue: ((step + 1) / STEPS.length) * 0.88,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      step++;
      if (step < STEPS.length) {
        stepperRef.current = setTimeout(tick, STEP_DURATION);
      }
    };
    tick();

    return () => {
      if (stepperRef.current) clearTimeout(stepperRef.current);
      spinLoop.current?.stop();
    };
  }, [visible]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <View style={s.iconRing}>
              <Text style={s.docEmoji}>📄</Text>
            </View>
            <Animated.View
              style={[s.spinnerRing, { transform: [{ rotate }] }]}
            />
          </View>

          <Text style={s.title}>Analyzing your resume</Text>
          <Text style={s.subtitle}>
            {STEPS[Math.min(activeStep, STEPS.length - 1)]}…
          </Text>

          <View style={s.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  i < activeStep && s.dotDone,
                  i === activeStep && s.dotActive,
                ]}
              />
            ))}
          </View>

          <View style={s.stepsWrap}>
            {STEPS.map((label, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;
              return (
                <View key={label} style={s.stepRow}>
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
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
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
    backgroundColor: colors.surfaceAlt,
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
    borderTopColor: colors.primary,
    borderRightColor: colors.primaryLight,
  },
  docEmoji: {
    fontSize: 26,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  dotDone: {
    width: 8,
    backgroundColor: colors.success,
  },
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
    color: colors.textMuted,
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
