import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
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
  return StyleSheet.create({
    wrapper: {
      width: "100%",
    },

    label: {
      color: theme.textMuted,
      fontSize: 11,
      marginBottom: 6,
      letterSpacing: 0.6,
    },

    inputContainer: {
      flexDirection: "row",
      alignItems: "center",

      backgroundColor: theme.glass,
      borderRadius: 14,
      paddingHorizontal: 14,

      borderWidth: 1,
      borderColor: theme.border,
    },

    inputFocused: {
      borderColor: theme.secondary,
      shadowColor: theme.primary,
      shadowOpacity: 0.4,
      shadowRadius: 10,
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
