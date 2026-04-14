import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../../theme/color";
import { styles } from "../styles";
import { StatusPulseDot } from "./StatusPulseDot";

interface PremiumHeaderProps {
  /** When provided, shows a history icon button on the right */
  onHistoryPress?: () => void;
  /** Show a badge dot on the history icon (e.g. history exists) */
  hasHistory?: boolean;
}

export function PremiumHeader({ onHistoryPress, hasHistory }: PremiumHeaderProps) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerTitleRow}>
          <StatusPulseDot />
          <Text style={styles.headerTitle}>AI Coach</Text>
        </View>

        {onHistoryPress && (
          <TouchableOpacity
            onPress={onHistoryPress}
            style={styles.historyBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.65}
          >
            <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
            {hasHistory && (
              <View style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.primary,
                borderWidth: 1.5,
                borderColor: colors.background,
              }} />
            )}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.headerSubtitle}>
        <Text style={styles.headerSubtitleSpark}>✦</Text> Powered by Gemini
      </Text>
    </View>
  );
}
