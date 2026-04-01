import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../theme/color";

type Props = {
  label: string;
  value: number;
  max?: number;
  fillColor?: string;
  delayMs?: number;
};

export function ScoreBar({
  label,
  value,
  max = 100,
  fillColor = colors.primary,
  delayMs = 0,
}: Props) {
  const pct = useSharedValue(0);
  const target = Math.max(0, Math.min(100, (value / max) * 100));

  useEffect(() => {
    const t = setTimeout(() => {
      pct.value = withTiming(target, { duration: 650 });
    }, delayMs);
    return () => clearTimeout(t);
  }, [target, delayMs, pct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${pct.value}%`,
  }));

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { backgroundColor: fillColor }, fillStyle]}
        />
      </View>
      <Text style={styles.val}>{Math.round(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 14 },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  track: {
    height: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 6 },
  val: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    alignSelf: "flex-end",
  },
});
