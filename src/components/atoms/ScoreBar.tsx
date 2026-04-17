import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../../theme/useAppTheme";

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
  fillColor,
  delayMs = 0,
}: Props) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const resolvedFillColor = fillColor ?? theme.primary;

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
          style={[styles.fill, { backgroundColor: resolvedFillColor }, fillStyle]}
        />
      </View>
      <Text style={styles.val}>{Math.round(value)}</Text>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    row: { marginBottom: 14 },
    label: {
      color: theme.textSecondary,
      fontSize: 12,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    track: {
      height: 8,
      borderRadius: 6,
      backgroundColor: theme.surfaceAlt,
      overflow: "hidden",
    },
    fill: { height: "100%", borderRadius: 6 },
    val: {
      color: theme.textMuted,
      fontSize: 12,
      marginTop: 4,
      alignSelf: "flex-end",
    },
  });
}
