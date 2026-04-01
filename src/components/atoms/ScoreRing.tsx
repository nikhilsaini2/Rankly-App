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
import { Props } from "../../types";
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ScoreRing({
  size = 120,
  strokeWidth = 8,
  progress,
  strokeColor = colors.accent,
  displayValue,
  subtitle = "ATS",
  animated = false,
}: Props) {
  const score = Math.max(0, Math.min(100, displayValue ?? progress));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const staticOffset = circumference - (circumference * score) / 100;
  const pct = useSharedValue(animated ? 0 : score);
  const [scoreLabel, setScoreLabel] = useState(
    animated ? 0 : Math.round(score),
  );

  const animatedProps = useAnimatedProps(() => {
    const percentage = score > 0 ? (pct.value / score) * 100 : 0;
    const clamped = Math.max(0, Math.min(100, percentage));
    const offset = circumference - (circumference * clamped) / 100;
    return {
      strokeDashoffset: offset,
      strokeDasharray: circumference,
    };
  });

  useAnimatedReaction(
    () => pct.value,
    (value, previous) => {
      if (value !== previous) {
        runOnJS(setScoreLabel)(Math.round(value));
      }
    },
    [],
  );

  useEffect(() => {
    if (animated) {
      setScoreLabel(0);
      pct.value = withTiming(score, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      pct.value = score;
      setScoreLabel(Math.round(score));
    }
  }, [score, animated]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          stroke={colors.border}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          opacity={0.4}
        />

        {/* Score arc */}
        {animated ? (
          <AnimatedCircle
            animatedProps={animatedProps}
            stroke={strokeColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
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
            strokeDashoffset={staticOffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>

      {/* Center label */}
      <View style={styles.center}>
        <Text style={[styles.score, { fontSize: size * 0.26 }]}>
          {scoreLabel}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { fontSize: size * 0.11 }]}>
            {subtitle}
          </Text>
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
  sub: {
    color: colors.textSecondary,
    marginTop: -2,
  },
});
