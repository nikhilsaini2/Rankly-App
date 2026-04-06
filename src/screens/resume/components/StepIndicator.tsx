import React from 'react'
import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../../theme/color'
import { resumeStyles } from '../styles/resume.styles'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  stepTitle: string
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep, totalSteps, stepTitle
}) => (
  <View>
    <View style={resumeStyles.progressBarContainer}>
      <View style={[
        resumeStyles.progressBarFill,
        { width: `${(currentStep / totalSteps) * 100}%` }
      ]} />
    </View>
    <View style={resumeStyles.stepMeta}>
      <Text style={resumeStyles.stepMetaText}>
        Step {currentStep} of {totalSteps}
      </Text>
      <Text style={resumeStyles.stepMetaTitle}>{stepTitle}</Text>
    </View>
  </View>
)
