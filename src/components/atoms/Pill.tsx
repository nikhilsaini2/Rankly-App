import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { getElevation } from "../../theme";
import { useAppTheme } from "../../theme/useAppTheme";

interface PillProps {
  label: string;
  selected: boolean;
  tone: "primary" | "easy" | "medium" | "hard";
  onPress: () => void;
}

export function Pill({ label, selected, tone, onPress }: PillProps) {
  const theme = useAppTheme();
  const elevation = getElevation(theme);

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
          return theme.onPrimary;
        case "easy":
          return theme.onPrimary;
        case "medium":
          return theme.onPrimary;
        case "hard":
          return theme.onPrimary;
        default:
          return theme.onPrimary;
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
          ...(selected ? elevation.subtle : {}),
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
