import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../../../theme/useAppTheme";

type Props = {
  visible: boolean;
  progress: number;
};

export function UploadingOverlay({ visible, progress }: Props) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220 });
      scale.value = withSpring(1, { damping: 18, stiffness: 160 });
    } else {
      opacity.value = withTiming(0, { duration: 260 });
      scale.value = withTiming(0.92, { duration: 200 });
    }
  }, [visible]);

  useEffect(() => {
    progressWidth.value = withTiming(progress * 100, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: opacity.value > 0 ? "auto" : "none",
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (!visible && opacity.value === 0) return null;

  const pct = Math.round(progress * 100);

  return (
    <Reanimated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, overlayStyle]}>
      <Reanimated.View style={[styles.card, cardStyle]}>
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={[theme.secondary, theme.secondaryDark]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.iconEmoji}>📄</Text>
          </LinearGradient>
        </View>

        <Text style={styles.title}>Uploading resume</Text>
        <Text style={styles.subtitle}>
          {pct < 100 ? "Please wait while we upload your file…" : "Processing…"}
        </Text>

        <View style={styles.barTrack}>
          <Reanimated.View style={[styles.barFill, barStyle]}>
            <LinearGradient
              colors={[theme.primary, theme.accent]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Reanimated.View>
        </View>

        <Text style={styles.pct}>{pct}%</Text>
      </Reanimated.View>
    </Reanimated.View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    backdrop: {
      backgroundColor: "rgba(8,8,16,0.82)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 999,
    },
    card: {
      width: 280,
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 28,
      alignItems: "center",
      gap: 12,
    },
    iconWrap: {
      marginBottom: 4,
    },
    iconGradient: {
      width: 60,
      height: 60,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    iconEmoji: {
      fontSize: 28,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
    },
    barTrack: {
      width: "100%",
      height: 6,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 6,
      overflow: "hidden",
      marginTop: 4,
    },
    barFill: {
      height: 6,
      borderRadius: 6,
      overflow: "hidden",
      minWidth: 6,
    },
    pct: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
  });
}
