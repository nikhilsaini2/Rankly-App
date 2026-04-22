import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import {
  Platform,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
} from "react-native";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createResumeStyles } from "../styles/resume.styles";

interface FieldInputProps extends TextInputProps {
  label: string;
  icon: string | null;
  required?: boolean;
  multiline?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

const androidFontStyle: TextStyle =
  Platform.OS === "android" ? { includeFontPadding: false } : {};

export const FieldInput: React.FC<FieldInputProps> = memo(
  ({
    label,
    icon,
    required,
    multiline,
    hasError,
    errorMessage,
    style,
    onBlur,
    onFocus,
    ...props
  }) => {
    const theme = useAppTheme();
    const resumeStyles = createResumeStyles(theme);

    const errorBorderStyle = hasError
      ? { borderColor: theme.error, borderWidth: 1.5 }
      : {};

    return (
      <View style={resumeStyles.fieldGroup}>
        <Text
          style={resumeStyles.fieldLabel}
          allowFontScaling={false}
          accessibilityRole="text"
        >
          {label}
          {required && <Text style={resumeStyles.required}> *</Text>}
        </Text>
        <View
          style={[
            multiline
              ? resumeStyles.inputWrapperMultiline
              : resumeStyles.inputWrapper,
            errorBorderStyle,
          ]}
        >
          {icon ? (
            <View style={resumeStyles.inputIconContainer}>
              <Ionicons name={icon as any} size={16} color={theme.textMuted} />
            </View>
          ) : null}
          <TextInput
            style={[
              multiline
                ? resumeStyles.inputMultiline
                : resumeStyles.inputSingleLine,
              androidFontStyle,
              style,
            ]}
            placeholderTextColor={theme.placeholder}
            multiline={multiline}
            scrollEnabled={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            allowFontScaling={false}
            numberOfLines={multiline ? undefined : 1}
            onBlur={onBlur}
            onFocus={onFocus}
            {...props}
          />
        </View>
        {errorMessage && (
          <Text
            style={{
              fontSize: 11,
              color: theme.error,
              marginTop: 4,
              marginLeft: 2,
              lineHeight: 14,
            }}
          >
            {errorMessage}
          </Text>
        )}
      </View>
    );
  },
);
