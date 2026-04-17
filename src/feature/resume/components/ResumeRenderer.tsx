import React, { memo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createResumeStyles } from "../styles/resume.styles";
import type { GeneratedResume, ResumeFormData } from "../types/resume.types";

export interface ResumeRendererProps {
  generatedResume: GeneratedResume;
  formData?: Partial<ResumeFormData>;
  onAction?: () => void;
  processing?: boolean;
  onReset?: () => void;
  onBack?: () => void;
  actionLabel?: string;
  backLabel?: string;
  resetLabel?: string;
}

export const ResumeRenderer = memo(function ResumeRenderer({
  generatedResume,
  formData,
  onAction,
  processing = false,
  onReset,
  onBack,
  actionLabel = "📄 Download & Share PDF",
  backLabel = "Back",
  resetLabel = "✏️ Start Over",
}: ResumeRendererProps) {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 70;
  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;

  const fullName = formData?.fullName ?? "";
  const targetRole = formData?.targetRole ?? "";
  const email = formData?.email ?? "";
  const phone = formData?.phone ?? "";
  const city = formData?.city ?? "";
  const linkedin = formData?.linkedin ?? "";
  const degree = formData?.degree ?? "";
  const institution = formData?.institution ?? "";
  const graduationYear = formData?.graduationYear ?? "";
  const grade = formData?.grade ?? "";
  const certifications = formData?.certifications ?? "";
  const languages = formData?.languages ?? "";

  const hasHeader = fullName || targetRole || email || phone || city || linkedin;
  const hasEducation = degree || institution;
  const hasCertifications = !!certifications;
  const hasLanguages = !!languages;
  const contactLine = [email, phone, city].filter(Boolean).join(" • ");

  return (
    <ScrollView
      style={resumeStyles.resultsScroll}
      contentContainerStyle={[resumeStyles.resultsContent, { paddingBottom: bottomInset + 20 }]}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      {hasHeader && (
        <View style={resumeStyles.resultCard}>
          {fullName ? <Text style={[resumeStyles.resultTitle, { fontSize: 22, fontWeight: "800" }]}>{fullName}</Text> : null}
          {targetRole ? <Text style={[resumeStyles.resultSubtitle, { color: theme.accent }]}>{targetRole}</Text> : null}
          {contactLine ? <Text style={[resumeStyles.resultMeta, { fontSize: 12, color: theme.textSecondary }]}>{contactLine}</Text> : null}
          {linkedin ? <Text style={[resumeStyles.resultMeta, { fontSize: 12, color: theme.textSecondary }]}>{linkedin}</Text> : null}
        </View>
      )}

      {generatedResume.professionalSummary ? (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Professional Summary</Text>
          <Text style={resumeStyles.cardContent}>{generatedResume.professionalSummary}</Text>
        </View>
      ) : null}

      {generatedResume.enhancedExperiences.length > 0 && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Work Experience</Text>
          {generatedResume.enhancedExperiences.map((exp, index) => (
            <View key={index} style={index > 0 ? { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border } : undefined}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary, flex: 1 }}>{exp.jobTitle}</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 8 }}>{exp.duration}</Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontStyle: "italic", marginBottom: 8 }}>{exp.company}</Text>
              {exp.bulletPoints.slice(0, 4).map((bp, i) => (
                <View key={i} style={resumeStyles.bulletRow}>
                  <View style={resumeStyles.bullet} />
                  <Text style={resumeStyles.bulletText}>{bp}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {generatedResume.coreSkills.length > 0 && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Core Skills</Text>
          <View style={resumeStyles.skillRow}>
            {generatedResume.coreSkills.map((skill, index) => (
              <View key={index} style={[resumeStyles.pill, { backgroundColor: theme.accent + "20", borderColor: theme.accent }]}>
                <Text style={[resumeStyles.pillText, { color: theme.accent }]}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {hasEducation && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Education</Text>
          <View style={resumeStyles.eduEntry}>
            <View style={resumeStyles.eduLeft}>
              <Text style={[resumeStyles.eduDegree, { fontWeight: "600" }]}>{degree}</Text>
              <Text style={resumeStyles.eduInstitution}>{institution}</Text>
              {grade ? <Text style={resumeStyles.eduInstitution}>{grade}</Text> : null}
            </View>
            {graduationYear ? <Text style={resumeStyles.eduRight}>{graduationYear}</Text> : null}
          </View>
        </View>
      )}

      {hasCertifications && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Certifications</Text>
          {certifications.split(",").map((cert, index) => (
            <View key={index} style={resumeStyles.bulletRow}>
              <View style={resumeStyles.bullet} />
              <Text style={resumeStyles.bulletText}>{cert.trim()}</Text>
            </View>
          ))}
        </View>
      )}

      {hasLanguages && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Languages</Text>
          <Text style={resumeStyles.cardContent}>{languages}</Text>
        </View>
      )}

      {onAction && (
        <TouchableOpacity style={[resumeStyles.previewPrimaryButton, processing && { opacity: 0.6 }]} onPress={onAction} disabled={processing}>
          <Text style={resumeStyles.primaryButtonText}>{processing ? "Processing..." : actionLabel}</Text>
        </TouchableOpacity>
      )}

      {onReset && (
        <TouchableOpacity style={[resumeStyles.previewGhostButton, { marginTop: 10 }]} onPress={onReset}>
          <Text style={resumeStyles.ghostButtonText}>{resetLabel}</Text>
        </TouchableOpacity>
      )}

      {onBack && !onReset && (
        <TouchableOpacity style={[resumeStyles.previewGhostButton, { marginTop: 10 }]} onPress={onBack}>
          <Text style={resumeStyles.ghostButtonText}>{backLabel}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
});
