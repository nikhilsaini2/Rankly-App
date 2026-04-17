import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";

interface PillProps {
  label: string;
  selected: boolean;
  tone: "primary" | "easy" | "medium" | "hard";
  onPress: () => void;
}

export function Pill({ label, selected, tone, onPress }: PillProps) {
  const theme = useAppTheme();

  const getBackgroundColor = () => {
    if (selected) {
      switch (tone) {
        case "primary":
          return theme.primary;
        case "easy":
          return theme.accent;
        case "medium":
          return theme.warning;
        case "hard":
          return theme.danger;
        default:
          return theme.primary;
      }
    }
    return theme.surfaceAlt;
  };

  const getTextColor = () => {
    if (selected) {
      switch (tone) {
        case "primary":
          return theme.textPrimary;
        case "easy":
          return "#000000";
        case "medium":
          return theme.textPrimary;
        case "hard":
          return theme.textPrimary;
        default:
          return theme.textPrimary;
      }
    }
    return theme.textSecondary;
  };

  const getBorderColor = () => {
    if (selected) {
      switch (tone) {
        case "primary":
          return theme.primary;
        case "easy":
          return theme.accent;
        case "medium":
          return theme.warning;
        case "hard":
          return theme.danger;
        default:
          return theme.primary;
      }
    }
    return theme.border;
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
