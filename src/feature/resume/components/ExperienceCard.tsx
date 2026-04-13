import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors } from "../../../theme/color";
import { resumeStyles } from "../styles/resume.styles";
import type { WorkExperience } from "../types/resume.types";

interface ExperienceCardProps {
  experience: WorkExperience;
  index: number;
  showDelete: boolean;
  onUpdate: (field: keyof WorkExperience, value: string) => void;
  onDelete: () => void;
}

export const ExperienceCard: React.FC<ExperienceCardProps> = ({
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
      <Text style={resumeStyles.expCardTitle}>
        {experience.jobTitle || `Role ${index + 1}`}
      </Text>
      {showDelete && (
        <TouchableOpacity onPress={onDelete} style={resumeStyles.expDeleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
        </TouchableOpacity>
      )}
    </View>

    <View style={resumeStyles.fieldGroup}>
      <Text style={resumeStyles.fieldLabel}>Job Title</Text>
      <View style={resumeStyles.inputWrapper}>
        <Ionicons
          name="briefcase-outline"
          size={16}
          color={colors.textMuted}
          style={resumeStyles.inputIcon}
        />
        <TextInput
          style={resumeStyles.inputWithIcon}
          value={experience.jobTitle}
          onChangeText={(text) => onUpdate("jobTitle", text)}
          placeholder="e.g. Senior Software Engineer"
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>

    <View style={resumeStyles.fieldGroup}>
      <Text style={resumeStyles.fieldLabel}>Company Name</Text>
      <View style={resumeStyles.inputWrapper}>
        <Ionicons
          name="business-outline"
          size={16}
          color={colors.textMuted}
          style={resumeStyles.inputIcon}
        />
        <TextInput
          style={resumeStyles.inputWithIcon}
          value={experience.company}
          onChangeText={(text) => onUpdate("company", text)}
          placeholder="e.g. Google, Microsoft"
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>

    <View style={resumeStyles.fieldGroup}>
      <Text style={resumeStyles.fieldLabel}>Duration</Text>
      <View style={resumeStyles.inputWrapper}>
        <Ionicons
          name="calendar-outline"
          size={16}
          color={colors.textMuted}
          style={resumeStyles.inputIcon}
        />
        <TextInput
          style={resumeStyles.inputWithIcon}
          value={experience.duration}
          onChangeText={(text) => onUpdate("duration", text)}
          placeholder="e.g. Jan 2022 – Mar 2024"
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>

    <View style={resumeStyles.fieldGroup}>
      <Text style={resumeStyles.fieldLabel}>Key Achievement 1</Text>
      <View style={resumeStyles.inputWrapper}>
        <Ionicons
          name="checkmark-circle-outline"
          size={16}
          color={colors.textMuted}
          style={resumeStyles.inputIcon}
        />
        <TextInput
          style={resumeStyles.inputWithIcon}
          value={experience.achievement1}
          onChangeText={(text) => onUpdate("achievement1", text)}
          placeholder="e.g. Led team of 5 engineers..."
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>

    <View style={resumeStyles.fieldGroup}>
      <Text style={resumeStyles.fieldLabel}>Key Achievement 2</Text>
      <View style={resumeStyles.inputWrapper}>
        <Ionicons
          name="checkmark-circle-outline"
          size={16}
          color={colors.textMuted}
          style={resumeStyles.inputIcon}
        />
        <TextInput
          style={resumeStyles.inputWithIcon}
          value={experience.achievement2}
          onChangeText={(text) => onUpdate("achievement2", text)}
          placeholder="e.g. Increased revenue by 30%..."
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
  </View>
);
