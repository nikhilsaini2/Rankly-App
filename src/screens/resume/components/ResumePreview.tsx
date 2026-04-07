import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../../theme/color";
import { resumeStyles } from "../styles/resume.styles";
import type { GeneratedResume, ResumeFormData } from "../types/resume.types";

interface ResumePreviewProps {
  formData: ResumeFormData;
  generatedResume: GeneratedResume;
  isHistoryView: boolean;
  exporting: boolean;
  onExport: () => void;
  onShare: () => void;
  onReset: () => void;
  onBackToHistory: () => void;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({
  formData,
  generatedResume,
  isHistoryView,
  exporting,
  onExport,
  onShare,
  onReset,
  onBackToHistory,
}) => (
  <ScrollView
    style={[
      resumeStyles.resultsScroll,
      { marginBottom: isHistoryView ? 0 : 50 },
    ]}
    contentContainerStyle={resumeStyles.resultsContent}
    bounces={false}
  >
    {/* History View Banner */}
    {isHistoryView && (
      <TouchableOpacity
        style={resumeStyles.historyViewBanner}
        onPress={onBackToHistory}
      >
        <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
        <Text style={resumeStyles.historyViewBannerText}>Back to History</Text>
      </TouchableOpacity>
    )}

    {/* CARD 1 - HEADER SECTION */}
    <View style={resumeStyles.resultCard}>
      <Text
        style={[resumeStyles.resultTitle, { fontSize: 22, fontWeight: "800" }]}
      >
        {formData.fullName || "Your Name"}
      </Text>
      <Text style={[resumeStyles.resultSubtitle, { color: colors.accent }]}>
        {formData.targetRole}
      </Text>
      <Text
        style={[
          resumeStyles.resultMeta,
          { fontSize: 12, color: colors.textSecondary },
        ]}
      >
        {formData.email ? `${formData.email} • ` : ""}
        {formData.phone ? `${formData.phone} • ` : ""}
        {formData.city || ""}
      </Text>
      {formData.linkedin && (
        <Text
          style={[
            resumeStyles.resultMeta,
            { fontSize: 12, color: colors.textSecondary },
          ]}
        >
          {formData.linkedin}
        </Text>
      )}
    </View>

    {/* CARD 2 - PROFESSIONAL SUMMARY */}
    <View style={resumeStyles.resultCard}>
      <Text style={resumeStyles.cardTitle}>Professional Summary</Text>
      <Text style={resumeStyles.cardContent}>
        {generatedResume.professionalSummary}
      </Text>
    </View>

    {/* CARD 3 - WORK EXPERIENCE */}
    {generatedResume.enhancedExperiences.length > 0 && (
      <View style={resumeStyles.resultCard}>
        <Text style={resumeStyles.cardTitle}>Work Experience</Text>
        {generatedResume.enhancedExperiences.map((exp, index) => (
          <View key={index} style={{ marginBottom: 14 }}>
            <Text style={[resumeStyles.resultSubtitle, { fontWeight: "700" }]}>
              {exp.jobTitle}
              <Text style={[resumeStyles.resultMeta, { fontStyle: "italic" }]}>
                {" "}
                {exp.company}
              </Text>
              <Text
                style={[
                  resumeStyles.resultMeta,
                  { color: colors.textSecondary },
                ]}
              >
                {" "}
                {exp.duration}
              </Text>
            </Text>
            <Text style={[resumeStyles.resultMeta, { fontStyle: "italic" }]}>
              {exp.company}
            </Text>
            {exp.bulletPoints.map((bp, i) => (
              <View key={i} style={resumeStyles.bulletRow}>
                <View style={resumeStyles.bullet} />
                <Text style={resumeStyles.bulletText}>{bp}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    )}

    {/* CARD 4 - EDUCATION */}
    <View style={resumeStyles.resultCard}>
      <Text style={resumeStyles.cardTitle}>Education</Text>
      <View style={resumeStyles.eduEntry}>
        <View style={resumeStyles.eduLeft}>
          <Text style={[resumeStyles.eduDegree, { fontWeight: "600" }]}>
            {formData.degree}
          </Text>
          <Text style={resumeStyles.eduInstitution}>
            {formData.institution}
          </Text>
          {formData.grade && (
            <Text style={resumeStyles.eduInstitution}>{formData.grade}</Text>
          )}
        </View>
        <Text style={resumeStyles.eduRight}>{formData.graduationYear}</Text>
      </View>
    </View>

    {/* CARD 5 - SKILLS */}
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

    {/* CARD 6 - CERTIFICATIONS */}
    {formData.certifications && (
      <View style={resumeStyles.resultCard}>
        <Text style={resumeStyles.cardTitle}>Certifications</Text>
        {formData.certifications.split(",").map((cert, index) => (
          <View key={index} style={resumeStyles.bulletRow}>
            <View style={resumeStyles.bullet} />
            <Text style={resumeStyles.bulletText}>{cert.trim()}</Text>
          </View>
        ))}
      </View>
    )}

    {/* CARD 7 - LANGUAGES */}
    {formData.languages && (
      <View style={resumeStyles.resultCard}>
        <Text style={resumeStyles.cardTitle}>Languages</Text>
        <Text style={resumeStyles.cardContent}>{formData.languages}</Text>
      </View>
    )}

    {/* Bottom buttons */}
    {isHistoryView ? (
      <>
        <TouchableOpacity
          style={[resumeStyles.primaryButton, { height: 56 }]}
          onPress={onExport}
          disabled={exporting}
        >
          <Text style={resumeStyles.primaryButtonText}>
            {exporting ? "Exporting..." : "📄 Re-export PDF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={resumeStyles.ghostButton}
          onPress={onBackToHistory}
        >
          <Text style={resumeStyles.ghostButtonText}>Back to History</Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <TouchableOpacity
          style={[resumeStyles.primaryButton, { height: 56 }]}
          onPress={onExport}
          disabled={exporting}
        >
          <Text style={resumeStyles.primaryButtonText}>
            {exporting ? "Exporting..." : "📄 Export as PDF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={resumeStyles.ghostButton} onPress={onReset}>
          <Text style={resumeStyles.ghostButtonText}>✏️ Start Over</Text>
        </TouchableOpacity>
      </>
    )}
  </ScrollView>
);
