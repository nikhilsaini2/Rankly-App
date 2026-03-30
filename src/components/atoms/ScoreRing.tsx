import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../../theme/color";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size?: number;
  strokeWidth?: number;
  progress: number;
  strokeColor?: string;
  displayValue?: number;
  subtitle?: string;
  animated?: boolean;
};

export function ScoreRing({
  size = 120,
  strokeWidth = 8,
  progress,
  strokeColor = colors.accent,
  displayValue,
  subtitle = "ATS",
  animated = false,
}: Props) {
  const target = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = useSharedValue(animated ? 0 : target);
  const finalScore =
    displayValue !== undefined ? displayValue : Math.round(target);
  const [scoreLabel, setScoreLabel] = useState(
    animated ? 0 : finalScore,
  );

  useAnimatedReaction(
    () => Math.round((pct.value / 100) * finalScore),
    (v, prev) => {
      if (v !== prev) {
        runOnJS(setScoreLabel)(v);
      }
    },
  );

  useEffect(() => {
    if (animated) {
      setScoreLabel(0);
      pct.value = withTiming(target, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      pct.value = target;
      setScoreLabel(finalScore);
    }
  }, [target, animated, finalScore, pct]);

  const animatedProps = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(100, pct.value));
    const off = circumference - (circumference * p) / 100;
    return { strokeDashoffset: off };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={colors.border}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          opacity={0.5}
        />
        {animated ? (
          <AnimatedCircle
            stroke={strokeColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
            animatedProps={animatedProps}
          />
        ) : (
          <Circle
            stroke={strokeColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={
              circumference - (circumference * target) / 100
            }
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { fontSize: size * 0.26 }]}>
          {scoreLabel}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { fontSize: size * 0.11 }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  score: {
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  sub: { color: colors.textSecondary, marginTop: -2 },
});
