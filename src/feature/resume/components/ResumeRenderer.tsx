import React, { memo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../theme/color";
import { resumeStyles } from "../styles/resume.styles";
import type { GeneratedResume, ResumeFormData } from "../types/resume.types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ResumeRendererProps {
  generatedResume: GeneratedResume;
  formData?: Partial<ResumeFormData>;
  // Single unified action — export if needed, then share
  onAction?: () => void;
  processing?: boolean;
  // Secondary actions
  onReset?: () => void;
  onBack?: () => void;
  // Labels
  actionLabel?: string;
  backLabel?: string;
  resetLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 70;
  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;

  // Normalise optional formData fields to safe defaults
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

  const hasHeader =
    fullName || targetRole || email || phone || city || linkedin;
  const hasEducation = degree || institution;
  const hasCertifications = !!certifications;
  const hasLanguages = !!languages;

  const contactLine = [email, phone, city].filter(Boolean).join(" • ");

  return (
    <ScrollView
      style={resumeStyles.resultsScroll}
      contentContainerStyle={[
        resumeStyles.resultsContent,
        { paddingBottom: bottomInset + 20 },
      ]}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      {/* ── CARD 1 — Header ── */}
      {hasHeader && (
        <View style={resumeStyles.resultCard}>
          {fullName ? (
            <Text
              style={[
                resumeStyles.resultTitle,
                { fontSize: 22, fontWeight: "800" },
              ]}
            >
              {fullName}
            </Text>
          ) : null}
          {targetRole ? (
            <Text
              style={[resumeStyles.resultSubtitle, { color: colors.accent }]}
            >
              {targetRole}
            </Text>
          ) : null}
          {contactLine ? (
            <Text
              style={[
                resumeStyles.resultMeta,
                { fontSize: 12, color: colors.textSecondary },
              ]}
            >
              {contactLine}
            </Text>
          ) : null}
          {linkedin ? (
            <Text
              style={[
                resumeStyles.resultMeta,
                { fontSize: 12, color: colors.textSecondary },
              ]}
            >
              {linkedin}
            </Text>
          ) : null}
        </View>
      )}

      {/* ── CARD 2 — Professional Summary ── */}
      {generatedResume.professionalSummary ? (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Professional Summary</Text>
          <Text style={resumeStyles.cardContent}>
            {generatedResume.professionalSummary}
          </Text>
        </View>
      ) : null}

      {/* ── CARD 3 — Work Experience ── */}
      {generatedResume.enhancedExperiences.length > 0 && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Work Experience</Text>
          {generatedResume.enhancedExperiences.map((exp, index) => (
            <View
              key={index}
              style={
                index > 0
                  ? {
                      marginTop: 14,
                      paddingTop: 14,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }
                  : undefined
              }
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.textPrimary,
                    flex: 1,
                  }}
                >
                  {exp.jobTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginLeft: 8,
                  }}
                >
                  {exp.duration}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  fontStyle: "italic",
                  marginBottom: 8,
                }}
              >
                {exp.company}
              </Text>
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

      {/* ── CARD 4 — Core Skills ── */}
      {generatedResume.coreSkills.length > 0 && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Core Skills</Text>
          <View style={resumeStyles.skillRow}>
            {generatedResume.coreSkills.map((skill, index) => (
              <View
                key={index}
                style={[
                  resumeStyles.pill,
                  {
                    backgroundColor: colors.accent + "20",
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Text style={[resumeStyles.pillText, { color: colors.accent }]}>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── CARD 5 — Education ── */}
      {hasEducation && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Education</Text>
          <View style={resumeStyles.eduEntry}>
            <View style={resumeStyles.eduLeft}>
              <Text style={[resumeStyles.eduDegree, { fontWeight: "600" }]}>
                {degree}
              </Text>
              <Text style={resumeStyles.eduInstitution}>{institution}</Text>
              {grade ? (
                <Text style={resumeStyles.eduInstitution}>{grade}</Text>
              ) : null}
            </View>
            {graduationYear ? (
              <Text style={resumeStyles.eduRight}>{graduationYear}</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* ── CARD 6 — Certifications ── */}
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

      {/* ── CARD 7 — Languages ── */}
      {hasLanguages && (
        <View style={resumeStyles.resultCard}>
          <Text style={resumeStyles.cardTitle}>Languages</Text>
          <Text style={resumeStyles.cardContent}>{languages}</Text>
        </View>
      )}

      {/* ── Action buttons ── */}
      {onAction && (
        <TouchableOpacity
          style={[
            resumeStyles.previewPrimaryButton,
            processing && { opacity: 0.6 },
          ]}
          onPress={onAction}
          disabled={processing}
        >
          <Text style={resumeStyles.primaryButtonText}>
            {processing ? "Processing..." : actionLabel}
          </Text>
        </TouchableOpacity>
      )}

      {onReset && (
        <TouchableOpacity
          style={[resumeStyles.previewGhostButton, { marginTop: 10 }]}
          onPress={onReset}
        >
          <Text style={resumeStyles.ghostButtonText}>{resetLabel}</Text>
        </TouchableOpacity>
      )}

      {onBack && !onReset && (
        <TouchableOpacity
          style={[resumeStyles.previewGhostButton, { marginTop: 10 }]}
          onPress={onBack}
        >
          <Text style={resumeStyles.ghostButtonText}>{backLabel}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
});
