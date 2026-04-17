import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../theme/useAppTheme';
import { createResumeStyles } from '../styles/resume.styles';

interface StepTitleCardProps {
  icon: string;
  title: string;
  subtitle: string;
}

export const StepTitleCard: React.FC<StepTitleCardProps> = ({ icon, title, subtitle }) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);

  return (
    <View style={resumeStyles.stepTitleCard}>
      <View style={resumeStyles.stepIconCircle}>
        <Ionicons name={icon as any} size={22} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={resumeStyles.stepTitle}>{title}</Text>
        <Text style={resumeStyles.stepSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};
