import React, { useEffect } from "react";
import { View } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { styles } from "../styles";

export function StatusPulseDot() {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.8, { duration: 1800 }),
      -1,
      true,
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 1800 }),
      -1,
      true,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.statusDotWrap}>
      {/* <Animated.View style={[styles.statusDotRing, ringStyle]} /> */}
      <View style={styles.statusDotInner} />
    </View>
  );
}
