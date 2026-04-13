import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../../theme/color";

interface PillProps {
  label: string;
  selected: boolean;
  tone: "primary" | "easy" | "medium" | "hard";
  onPress: () => void;
}

export function Pill({ label, selected, tone, onPress }: PillProps) {
  const getBackgroundColor = () => {
    if (selected) {
      switch (tone) {
        case "primary":
          return colors.primary;
        case "easy":
          return colors.accent;
        case "medium":
          return colors.warning;
        case "hard":
          return colors.danger;
        default:
          return colors.primary;
      }
    }
    return colors.surfaceAlt;
  };

  const getTextColor = () => {
    if (selected) {
      switch (tone) {
        case "primary":
          return colors.textPrimary;
        case "easy":
          return "#000000";
        case "medium":
          return colors.textPrimary;
        case "hard":
          return colors.textPrimary;
        default:
          return colors.textPrimary;
      }
    }
    return colors.textSecondary;
  };

  const getBorderColor = () => {
    if (selected) {
      switch (tone) {
        case "primary":
          return colors.primary;
        case "easy":
          return colors.accent;
        case "medium":
          return colors.warning;
        case "hard":
          return colors.danger;
        default:
          return colors.primary;
      }
    }
    return colors.border;
  };

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.pillText,
          { color: getTextColor() },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "400",
    textTransform: "capitalize",
  },
});
