import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/color";
import { ButtonProps } from "../../types/common.types";

export const Button = ({
  onPress,
  leftText,
  rightText,
  icon,
  style,
}: ButtonProps) => {
  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
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

const styles = StyleSheet.create({
  button: {
    padding: 18,
    borderRadius: 24,
    alignItems: "center",

    // glow
    shadowColor: "#9B5CFF",
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 20,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  text: {
    color: colors.textPrimary,
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
