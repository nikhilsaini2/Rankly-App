import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../../theme/useAppTheme';
import { createResumeStyles } from '../styles/resume.styles';

interface PillSelectorProps {
  options: string[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  label?: string;
  required?: boolean;
}

export const PillSelector: React.FC<PillSelectorProps> = ({
  options, selected, onSelect, multiSelect, label, required,
}) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);

  const isSelected = (opt: string) =>
    multiSelect ? (selected as string[]).includes(opt) : selected === opt;

  return (
    <View style={resumeStyles.fieldGroup}>
      {label && (
        <Text style={resumeStyles.fieldLabel}>
          {label}
          {required && <Text style={{ color: "red" }}> *</Text>}
        </Text>
      )}
      <View style={resumeStyles.pillGrid}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[resumeStyles.pill, isSelected(opt) && resumeStyles.pillSelected]}
            onPress={() => onSelect(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected(opt) }}
            accessibilityLabel={opt}
          >
            <Text style={[resumeStyles.pillText, isSelected(opt) && resumeStyles.pillTextSelected]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
