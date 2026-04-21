import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { getElevation } from "../../theme";
import { useAppTheme } from "../../theme/useAppTheme";
import { ButtonProps } from "../../types/common.types";

export const Button = ({
  onPress,
  leftText,
  rightText,
  icon,
  style,
}: ButtonProps) => {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <LinearGradient
      colors={[theme.primary, theme.primaryDark]}
      style={[styles.button, style]}
    >
      <View style={styles.content}>
        {leftText && <Text style={styles.text}>{leftText}</Text>}

        {rightText && (
          <Text style={[styles.text, styles.highlight]}>{rightText}</Text>
        )}

        {icon && <View style={styles.icon}>{icon}</View>}
      </View>
    </LinearGradient>
  );
};

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const elevation = getElevation(theme);

  return StyleSheet.create({
    button: {
      padding: 18,
      borderRadius: 24,
      alignItems: "center",
      ...elevation.action,
    },

    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    text: {
      color: theme.onPrimary,
      fontSize: 15,
      fontWeight: "700",
    },

    highlight: {
      opacity: 0.85,
      fontWeight: "500",
    },

    icon: {
      marginLeft: 6,
    },
  });
}
