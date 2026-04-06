import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../theme/color";
import { ExperienceCard } from "./components/ExperienceCard";
import { FieldInput } from "./components/FieldInput";
import { PillSelector } from "./components/PillSelector";
import { ResumeHistoryList } from "./components/ResumeHistoryList";
import { ResumePreview } from "./components/ResumePreview";
import { StepIndicator } from "./components/StepIndicator";
import { StepTitleCard } from "./components/StepTitleCard";
import {
  EXPERIENCE_LEVELS,
  INDUSTRIES,
  LOADING_MESSAGES,
  STEP_ICONS,
  STEP_SUBTITLES,
  STEP_TITLES,
  TONES,
  TOTAL_STEPS,
} from "./constants/resume.constants";
import { useResumeBuilder } from "./hooks/useResumeBuilder";
import { resumeStyles } from "./styles/resume.styles";

export default function ResumeBuilderScreen() {
  const navigation = useNavigation();
  const resume = useResumeBuilder();

  // Animation for loading phase
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Loading animation effect
  React.useEffect(() => {
    if (resume.phase === "loading") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 }),
        ),
        -1,
        false,
      );

      const interval = setInterval(() => {
        resume.setLoadingMessage(
          (prev) => (prev + 1) % LOADING_MESSAGES.length,
        );
      }, 1500);

      return () => clearInterval(interval);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [resume.phase]);

  // Hardware back handler
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (resume.phase === "preview" || resume.phase === "exported") {
          resume.setPhase("input");
          resume.setSelectedResume(null);
          return true;
        }
        if (resume.phase === "input" && resume.currentStep > 1) {
          resume.handleBack(() => {});
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [resume.phase, resume.currentStep]),
  );

  // Loading phase
  if (resume.phase === "loading") {
    return (
      <View style={resumeStyles.loadingContainer}>
        <View style={resumeStyles.loadingIconWrapper}>
          <Animated.View style={pulseStyle}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={colors.accent}
            />
          </Animated.View>
        </View>
        <Text style={resumeStyles.loadingTitle}>Building your resume...</Text>
        <Text style={resumeStyles.loadingSubtitle}>
          {LOADING_MESSAGES[resume.loadingMessage]}
        </Text>
        <View style={resumeStyles.loadingDots}>
          {[0, 1, 2].map((i: number) => (
            <View
              key={i}
              style={[
                resumeStyles.loadingDot,
                resume.loadingMessage % 3 === i &&
                  resumeStyles.loadingDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  // Preview phase
  if (resume.phase === "preview" && resume.generatedResume) {
    return (
      <ResumePreview
        formData={resume.getFormData()}
        generatedResume={resume.generatedResume}
        isHistoryView={!!resume.selectedResume}
        exporting={resume.exporting}
        onExport={resume.exportPDF}
        onShare={resume.shareResume}
        onReset={resume.resetAll}
        onBackToHistory={() => {
          resume.setSelectedResume(null);
          resume.setPhase("input");
          resume.setInputTab("history");
        }}
      />
    );
  }

  // Exported phase
  if (resume.phase === "exported") {
    return (
      <View style={resumeStyles.loadingContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#00D4AA" />
        <Text style={resumeStyles.loadingTitle}>Resume Ready!</Text>
        <Text style={resumeStyles.loadingSubtitle}>
          Your PDF has been saved and is ready to share
        </Text>

        <View style={resumeStyles.buttonRow}>
          <TouchableOpacity
            style={[resumeStyles.primaryButton, { marginRight: 8 }]}
            onPress={resume.shareResume}
          >
            <Text style={resumeStyles.primaryButtonText}>Share Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={resumeStyles.ghostButton}
            onPress={resume.resetAll}
          >
            <Text style={resumeStyles.ghostButtonText}>Build Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Input phase
  return (
    <KeyboardAvoidingView
      style={resumeStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={resumeStyles.header}>
        <TouchableOpacity
          style={{ position: "absolute", marginLeft: 18 }}
          onPress={() => resume.handleBack(() => navigation.goBack())}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={resumeStyles.headerTitle}>Resume Builder</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={resumeStyles.scrollContent}
        contentContainerStyle={resumeStyles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <StepIndicator
          currentStep={resume.currentStep}
          totalSteps={TOTAL_STEPS}
          stepTitle={STEP_TITLES[resume.currentStep - 1]}
        />

        {/* Tab Bar — only on step 1 */}
        {resume.currentStep === 1 && (
          <View style={resumeStyles.tabBar}>
            <TouchableOpacity
              style={[
                resumeStyles.tab,
                resume.inputTab === "form" && resumeStyles.tabActive,
              ]}
              onPress={() => resume.setInputTab("form")}
            >
              <Ionicons
                name="add-circle-outline"
                size={15}
                color={
                  resume.inputTab === "form" ? "#fff" : colors.textSecondary
                }
              />
              <Text
                style={[
                  resumeStyles.tabText,
                  resume.inputTab === "form" && resumeStyles.tabTextActive,
                ]}
              >
                New Resume
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                resumeStyles.tab,
                resume.inputTab === "history" && resumeStyles.tabActive,
              ]}
              onPress={() => resume.setInputTab("history")}
            >
              <Ionicons
                name="time-outline"
                size={15}
                color={
                  resume.inputTab === "history" ? "#fff" : colors.textSecondary
                }
              />
              <Text
                style={[
                  resumeStyles.tabText,
                  resume.inputTab === "history" && resumeStyles.tabTextActive,
                ]}
              >
                History
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History Tab Content */}
        {resume.inputTab === "history" ? (
          <ResumeHistoryList
            history={resume.resumeHistory}
            loading={resume.historyLoading}
            onSelect={resume.viewFromHistory}
            onDelete={resume.deleteResumeHistory}
            onBuildNew={() => resume.setInputTab("form")}
          />
        ) : (
          <>
            <StepTitleCard
              icon={STEP_ICONS[resume.currentStep - 1]}
              title={STEP_TITLES[resume.currentStep - 1]}
              subtitle={STEP_SUBTITLES[resume.currentStep - 1]}
            />

            {/* Render current step form */}
            {resume.currentStep === 1 && <Step1 r={resume} />}
            {resume.currentStep === 2 && <Step2 r={resume} />}
            {resume.currentStep === 3 && <Step3 r={resume} />}
            {resume.currentStep === 4 && <Step4 r={resume} />}
            {resume.currentStep === 5 && <Step5 r={resume} />}

            <NavButtons
              onBack={() => resume.handleBack(() => navigation.goBack())}
              onNext={resume.handleNext}
              canProceed={resume.canProceed()}
              isLastStep={resume.currentStep === TOTAL_STEPS}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Step components
const Step1 = ({ r }: { r: any }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Full Name"
      icon="person-outline"
      required
      value={r.fullName}
      onChangeText={r.setFullName}
      placeholder="e.g. Nikhil Sharma"
    />
    <FieldInput
      label="Email Address"
      icon="mail-outline"
      required
      value={r.email}
      onChangeText={r.setEmail}
      placeholder="e.g. nikhil@example.com"
      keyboardType="email-address"
    />
    <FieldInput
      label="Phone Number"
      icon="call-outline"
      value={r.phone}
      onChangeText={r.setPhone}
      placeholder="e.g. +91 98765 43210"
      keyboardType="phone-pad"
    />
    <FieldInput
      label="LinkedIn URL"
      icon="logo-linkedin"
      value={r.linkedin}
      onChangeText={r.setLinkedin}
      placeholder="linkedin.com/in/yourname"
    />
    <FieldInput
      label="City / Location"
      icon="location-outline"
      value={r.city}
      onChangeText={r.setCity}
      placeholder="e.g. San Francisco, CA"
    />
  </View>
);

const Step2 = ({ r }: { r: any }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Target Job Title"
      icon="briefcase-outline"
      required
      value={r.targetRole}
      onChangeText={r.setTargetRole}
      placeholder="e.g. Senior Software Engineer, Product Manager"
    />

    <PillSelector
      label="Experience Level"
      options={EXPERIENCE_LEVELS}
      selected={r.experienceLevel}
      onSelect={r.setExperienceLevel}
    />

    <PillSelector
      label="Industry"
      options={INDUSTRIES}
      selected={r.industry}
      onSelect={r.setIndustry}
    />

    <FieldInput
      label="Key Skills"
      icon="code-slash-outline"
      required
      multiline
      value={r.skills}
      onChangeText={r.setSkills}
      placeholder="e.g. React Native, Python, SQL, Project Management, Leadership, Data Analysis..."
    />
  </View>
);

const Step3 = ({ r }: { r: any }) => (
  <View style={resumeStyles.formCard}>
    {r.experienceLevel === "Fresher" && (
      <View style={resumeStyles.infoNote}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={colors.accent}
        />
        <Text style={resumeStyles.infoNoteText}>
          💡 No experience? Add internships, college projects, or part-time work
        </Text>
      </View>
    )}

    {r.experiences.map((exp: any, index: number) => (
      <ExperienceCard
        key={index}
        experience={exp}
        index={index}
        showDelete={r.experiences.length > 1}
        onUpdate={(field, value) => r.updateExperience(index, field, value)}
        onDelete={() => r.removeExperience(index)}
      />
    ))}

    {r.experiences.length < 4 && (
      <TouchableOpacity
        style={resumeStyles.addRoleBtn}
        onPress={r.addExperience}
      >
        <View style={resumeStyles.addRoleBtnInner}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={resumeStyles.addRoleBtnText}>Add Another Role</Text>
        </View>
      </TouchableOpacity>
    )}
  </View>
);

const Step4 = ({ r }: { r: any }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Degree / Qualification"
      icon="school-outline"
      required
      value={r.degree}
      onChangeText={r.setDegree}
      placeholder="e.g. B.Tech Computer Science, MBA Finance"
    />
    <FieldInput
      label="Institution Name"
      icon="library-outline"
      required
      value={r.institution}
      onChangeText={r.setInstitution}
      placeholder="e.g. IIT Delhi, Stanford University"
    />
    <FieldInput
      label="Year of Completion"
      icon="calendar-outline"
      required
      value={r.graduationYear}
      onChangeText={r.setGraduationYear}
      placeholder="e.g. 2022"
      keyboardType="numeric"
    />
    <FieldInput
      label="Grade / GPA"
      icon="ribbon-outline"
      value={r.grade}
      onChangeText={r.setGrade}
      placeholder="e.g. 8.5 CGPA / 3.8 GPA"
    />
    <FieldInput
      label="Certifications"
      icon="medal-outline"
      multiline
      value={r.certifications}
      onChangeText={r.setCertifications}
      placeholder="e.g. AWS Certified, Google Analytics, PMP..."
    />
    <FieldInput
      label="Languages"
      icon="language-outline"
      value={r.languages}
      onChangeText={r.setLanguages}
      placeholder="e.g. English (Fluent), Hindi (Native)"
    />
  </View>
);

const Step5 = ({ r }: { r: any }) => (
  <View style={resumeStyles.formCard}>
    <PillSelector
      label="Resume Tone"
      options={TONES}
      selected={r.tone}
      onSelect={r.setTone}
    />

    <FieldInput
      label="Your Biggest Career Highlight"
      icon="sparkles-outline"
      multiline
      value={r.topAchievement}
      onChangeText={r.setTopAchievement}
      placeholder="e.g. Built an app with 10K users, Won national hackathon, Promoted within 6 months..."
    />

    <FieldInput
      label="Target Companies"
      icon="rocket-outline"
      value={r.targetCompanies}
      onChangeText={r.setTargetCompanies}
      placeholder="e.g. Google, early-stage startups, MNCs"
    />

    <FieldInput
      label="Special Instructions"
      icon="settings-outline"
      multiline
      value={r.specialInstructions}
      onChangeText={r.setSpecialInstructions}
      placeholder="e.g. Emphasize leadership, Keep it to 1 page..."
    />
  </View>
);

const NavButtons = ({
  onBack,
  onNext,
  canProceed,
  isLastStep,
}: {
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  isLastStep: boolean;
}) => (
  <View style={resumeStyles.navButtons}>
    <TouchableOpacity style={resumeStyles.backButton} onPress={onBack}>
      <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
      <Text style={resumeStyles.backButtonText}>Back</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        resumeStyles.nextButton,
        !canProceed && resumeStyles.nextButtonDisabled,
      ]}
      onPress={onNext}
      disabled={!canProceed}
    >
      <Text style={resumeStyles.nextButtonText}>
        {isLastStep ? "✨ Build Resume" : "Next"}
      </Text>
      {isLastStep ? null : (
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      )}
    </TouchableOpacity>
  </View>
);
