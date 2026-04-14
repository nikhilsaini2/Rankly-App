import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Platform, Text, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import { colors } from '../../../theme/color';
import { resumeStyles } from '../styles/resume.styles';

interface FieldInputProps extends TextInputProps {
  label: string;
  icon: string;
  required?: boolean;
  multiline?: boolean;
}

// Android-only style applied conditionally — keeps strict typing intact
const androidFontStyle: TextStyle =
  Platform.OS === 'android' ? { includeFontPadding: false } : {};

export const FieldInput: React.FC<FieldInputProps> = memo(({
  label, icon, required, multiline, style, onBlur, ...props
}) => (
  <View style={resumeStyles.fieldGroup}>
    <Text
      style={resumeStyles.fieldLabel}
      allowFontScaling={false}
      accessibilityRole="text"
    >
      {label}
      {required && <Text style={resumeStyles.required}> *</Text>}
    </Text>
    <View style={multiline ? resumeStyles.inputWrapperMultiline : resumeStyles.inputWrapper}>
      <View style={resumeStyles.inputIconContainer}>
        <Ionicons name={icon as any} size={16} color={colors.textMuted} />
      </View>
      <TextInput
        style={[
          multiline ? resumeStyles.inputMultiline : resumeStyles.inputSingleLine,
          androidFontStyle,
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        scrollEnabled={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        allowFontScaling={false}
        numberOfLines={multiline ? undefined : 1}
        onBlur={onBlur}
        {...props}
      />
    </View>
  </View>
));
