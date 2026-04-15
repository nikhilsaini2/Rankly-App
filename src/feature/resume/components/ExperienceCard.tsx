import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../../theme/color";
import { resumeStyles } from "../styles/resume.styles";
import type { WorkExperience } from "../types/resume.types";
import { FieldInput } from "./FieldInput";

interface ExperienceCardProps {
  experience: WorkExperience;
  index: number;
  showDelete: boolean;
  onUpdate: (field: keyof WorkExperience, value: string) => void;
  onDelete: () => void;
}

export const ExperienceCard: React.FC<ExperienceCardProps> = memo(({
  experience,
  index,
  showDelete,
  onUpdate,
  onDelete,
}) => (
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
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      )}
    </View>

    <FieldInput
      label="Job Title"
      icon="briefcase-outline"
      required
      value={experience.jobTitle}
      onChangeText={(v) => onUpdate("jobTitle", v)}
      placeholder="e.g. Senior Software Engineer"
      accessibilityLabel="Job title"
    />
    <FieldInput
      label="Company Name"
      icon="business-outline"
      required
      value={experience.company}
      onChangeText={(v) => onUpdate("company", v)}
      placeholder="e.g. Google, Microsoft"
      accessibilityLabel="Company name"
    />
    <FieldInput
      label="Duration"
      icon="calendar-outline"
      required
      value={experience.duration}
      onChangeText={(v) => onUpdate("duration", v)}
      placeholder="e.g. Jan 2022 – Mar 2024"
      accessibilityLabel="Employment duration"
    />
    <FieldInput
      label="Key Achievement 1"
      icon="checkmark-circle-outline"
      value={experience.achievement1}
      onChangeText={(v) => onUpdate("achievement1", v)}
      placeholder="e.g. Led team of 5 engineers..."
      accessibilityLabel="Key achievement one"
    />
    <FieldInput
      label="Key Achievement 2"
      icon="checkmark-circle-outline"
      value={experience.achievement2}
      onChangeText={(v) => onUpdate("achievement2", v)}
      placeholder="e.g. Increased revenue by 30%..."
      accessibilityLabel="Key achievement two"
    />
  </View>
));
