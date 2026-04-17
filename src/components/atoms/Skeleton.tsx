import React, { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../../theme/useAppTheme";

export function Skeleton({
  style,
  radius = 12,
}: {
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const theme = useAppTheme();
  const o = useSharedValue(0.45);

  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.45, { duration: 700 }),
      ),
      -1,
    );
  }, [o]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: o.value,
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: theme.surfaceAlt,
          borderRadius: radius,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}
