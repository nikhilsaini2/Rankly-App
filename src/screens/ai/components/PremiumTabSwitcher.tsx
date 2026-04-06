import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors } from "../../../theme/color";
import { styles } from "../styles";

type Props = {
  active: "chat" | "interview";
  onChange: (v: "chat" | "interview") => void;
};

export function PremiumTabSwitcher({ active, onChange }: Props) {
  const indicatorX = useSharedValue(active === "chat" ? 0 : 1);
  const [tabWidth, setTabWidth] = useState(0);

  useEffect(() => {
    indicatorX.value = withSpring(active === "chat" ? 0 : 1, {
      damping: 20,
      stiffness: 200,
    });
  }, [active]);

  const half = tabWidth / 2;

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * half }],
  }));

  return (
    <View
      style={styles.tabOuter}
      onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}
    >
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChange("chat")}
        accessibilityRole="button"
      >
        {active === "chat" && (
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={16}
            color={colors.primary}
            style={{ marginBottom: 2 }}
          />
        )}
        <Text
          style={[
            styles.tabText,
            active === "chat" ? styles.tabTextActive : styles.tabTextMuted,
          ]}
        >
          Chat
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChange("interview")}
        accessibilityRole="button"
      >
        {active === "interview" && (
          <Ionicons
            name="mic-outline"
            size={16}
            color={colors.primary}
            style={{ marginBottom: 2 }}
          />
        )}
        <Text
          style={[
            styles.tabText,
            active === "interview" ? styles.tabTextActive : styles.tabTextMuted,
          ]}
        >
          Interview
        </Text>
      </TouchableOpacity>

      {half > 0 && (
        <View style={styles.tabUnderlineTrack} pointerEvents="none">
          <Animated.View
            style={[styles.tabUnderline, underlineStyle, { width: half }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}
