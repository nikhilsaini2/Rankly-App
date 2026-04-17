import React from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createResumeStyles } from "../styles/resume.styles";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepTitle,
}) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);

  return (
    <View>
      <View style={resumeStyles.progressBarContainer}>
        <View
          style={[
            resumeStyles.progressBarFill,
            { width: `${(currentStep / totalSteps) * 100}%` },
          ]}
        />
      </View>
      <View style={resumeStyles.stepMeta}>
        <Text style={resumeStyles.stepMetaText}>
          Step {currentStep} of {totalSteps}
        </Text>
        <Text style={resumeStyles.stepMetaTitle}>{stepTitle}</Text>
      </View>
    </View>
  );
};
