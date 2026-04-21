import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { getElevation } from "../../theme";
import { useAppTheme } from "../../theme/useAppTheme";

type Props = TextInputProps & {
  label?: string;
  rightIcon?: React.ReactNode;
};

export const Input = ({ label, rightIcon, ...props }: Props) => {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputContainer, focused && styles.inputFocused]}>
        <TextInput
          {...props}
          placeholderTextColor={theme.placeholder}
          style={styles.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
    </View>
  );
};

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const elevation = getElevation(theme);

  return StyleSheet.create({
    wrapper: {
      width: "100%",
    },

    label: {
      color: theme.inputLabel,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 7,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },

    inputContainer: {
      flexDirection: "row",
      alignItems: "center",

      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      paddingHorizontal: 14,

      borderWidth: 1,
      borderColor: theme.border,
    },

    inputFocused: {
      borderColor: theme.secondary,
      ...elevation.subtle,
    },

    input: {
      flex: 1,
      paddingVertical: 12,
      color: theme.textPrimary,
      fontSize: 14,
    },

    icon: {
      marginLeft: 8,
    },
  });
}
