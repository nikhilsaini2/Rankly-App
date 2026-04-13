import React from 'react'
import { View, Text, TextInput, TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../../theme/color'
import { resumeStyles } from '../styles/resume.styles'

interface FieldInputProps extends TextInputProps {
  label: string
  icon: string
  required?: boolean
  multiline?: boolean
}

export const FieldInput: React.FC<FieldInputProps> = ({
  label, icon, required, multiline, ...props
}) => (
  <View style={resumeStyles.fieldGroup}>
    <Text style={resumeStyles.fieldLabel}>
      {label}
      {required && (
        <Text style={resumeStyles.required}> *</Text>
      )}
    </Text>
    <View style={[
      resumeStyles.inputWrapper,
      multiline && resumeStyles.inputWrapperMultiline,
    ]}>
      <Ionicons
        name={icon as any}
        size={16}
        color={colors.textMuted}
        style={resumeStyles.inputIcon}
      />
      <TextInput
        style={[
          resumeStyles.inputWithIcon,
          multiline && resumeStyles.inputMultiline,
        ]}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        {...props}
      />
    </View>
  </View>
)
