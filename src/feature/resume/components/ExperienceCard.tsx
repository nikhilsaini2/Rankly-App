import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createResumeStyles } from "../styles/resume.styles";
import type { WorkExperience } from "../types/resume.types";
import { FieldInput } from "./FieldInput";

interface ExperienceCardProps {
  experience: WorkExperience;
  index: number;
  showDelete: boolean;
  onUpdate: (field: keyof WorkExperience, value: string) => void;
  onDelete: () => void;
  onBlur?: (field: keyof WorkExperience) => void;
  errors?: Record<string, string>;
  fieldsRequired?: boolean;
}

export const ExperienceCard: React.FC<ExperienceCardProps> = ({
  experience, index, showDelete, onUpdate, onDelete, onBlur, errors = {}, fieldsRequired = true,
}) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);

  const jobTitleError = errors[`experiences[${index}].jobTitle`];
  const companyError = errors[`experiences[${index}].company`];
  const durationError = errors[`experiences[${index}].duration`];

  return (
    <View style={resumeStyles.expCard}>
      <View style={resumeStyles.expCardHeader}>
        <View style={resumeStyles.expCardNumber}>
          <Text style={resumeStyles.expCardNumberText}>{index + 1}</Text>
        </View>
        <Text style={resumeStyles.expCardTitle} numberOfLines={1}>
          {experience.jobTitle || `Role ${index + 1}`}
        </Text>
        {showDelete && (
          <TouchableOpacity
            onPress={onDelete}
            style={resumeStyles.expDeleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Delete this experience"
          >
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
          </TouchableOpacity>
        )}
      </View>

      <FieldInput label="Job Title" icon="briefcase-outline" required={fieldsRequired} value={experience.jobTitle} onChangeText={(v) => onUpdate("jobTitle", v)} onBlur={() => onBlur?.("jobTitle")} placeholder="Senior Software Engineer" accessibilityLabel="Job title" hasError={!!jobTitleError} errorMessage={jobTitleError} />
      <FieldInput label="Company Name" icon="business-outline" required={fieldsRequired} value={experience.company} onChangeText={(v) => onUpdate("company", v)} onBlur={() => onBlur?.("company")} placeholder="Google, Microsoft" accessibilityLabel="Company name" hasError={!!companyError} errorMessage={companyError} />
      <FieldInput label="Duration" icon="calendar-outline" required={fieldsRequired} value={experience.duration} onChangeText={(v) => onUpdate("duration", v)} onBlur={() => onBlur?.("duration")} placeholder="Jan 2022 – Mar 2024" accessibilityLabel="Employment duration" hasError={!!durationError} errorMessage={durationError} />
      <FieldInput label="Key Achievement 1" icon="checkmark-circle-outline" value={experience.achievement1} onChangeText={(v) => onUpdate("achievement1", v)} placeholder="Led team of 5 engineers..." accessibilityLabel="Key achievement one" />
      <FieldInput label="Key Achievement 2" icon="checkmark-circle-outline" value={experience.achievement2} onChangeText={(v) => onUpdate("achievement2", v)} placeholder="Increased revenue by 30%..." accessibilityLabel="Key achievement two" />
    </View>
  );
};
