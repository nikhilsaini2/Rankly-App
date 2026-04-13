import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../theme/color";
import { ExperienceCard } from "../components/ExperienceCard";
import { FieldInput } from "../components/FieldInput";
import { PillSelector } from "../components/PillSelector";
import { ResumeHistoryList } from "../components/ResumeHistoryList";
import { ResumePreview } from "../components/ResumePreview";
import { StepIndicator } from "../components/StepIndicator";
import { StepTitleCard } from "../components/StepTitleCard";
import {
  EXPERIENCE_LEVELS,
  INDUSTRIES,
  LOADING_MESSAGES,
  STEP_ICONS,
  STEP_SUBTITLES,
  STEP_TITLES,
  TONES,
  TOTAL_STEPS,
} from "../constants/resume.constants";
import { useResumeEngine } from "../hooks/useResumeEngine";
import { resumeStyles } from "../styles/resume.styles";

export default function ResumeBuilderScreen() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;
  const navigation = useNavigation();
  const engine = useResumeEngine();
  const { state, dispatch } = engine;

  // Animation for loading phase
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Loading animation effect
  useEffect(() => {
    if (state.asyncStatus === "loading") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
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
        dispatch({
          type: "START_ASYNC",
          messageIndex: (state.loadingMessage + 1) % LOADING_MESSAGES.length,
        });
      }, 1500);

      return () => clearInterval(interval);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [state.asyncStatus, state.loadingMessage, dispatch]);

  // Hardware back handler
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (state.phase === "preview" || state.phase === "exported") {
          dispatch({ type: "SET_PHASE", phase: "input" });
          return true;
        }
        if (state.phase === "input" && state.currentStep > 1) {
          engine.handleBack(() => {});
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [state.phase, state.currentStep, engine, dispatch])
  );

  // Loading phase
  if (state.phase === "loading" && state.asyncStatus === "loading") {
    return (
      <View style={resumeStyles.loadingContainer}>
        <View style={resumeStyles.loadingIconWrapper}>
          <Animated.View style={pulseStyle}>
            <Ionicons name="document-text-outline" size={64} color={colors.accent} />
          </Animated.View>
        </View>
        <Text style={resumeStyles.loadingTitle}>Building your resume...</Text>
        <Text style={resumeStyles.loadingSubtitle}>
          {LOADING_MESSAGES[state.loadingMessage]}
        </Text>
        <View style={resumeStyles.loadingDots}>
          {[0, 1, 2].map((i: number) => (
            <View
              key={i}
              style={[
                resumeStyles.loadingDot,
                state.loadingMessage % 3 === i && resumeStyles.loadingDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  // Preview phase
  if (state.phase === "preview" && state.generatedResume) {
    return (
      <ResumePreview
        formData={state.formData}
        generatedResume={state.generatedResume}
        isHistoryView={!!state.selectedResume}
        exporting={state.asyncStatus === "loading"}
        onExport={engine.exportPDF}
        onShare={engine.shareResume}
        onReset={() => dispatch({ type: "RESET_BUILDER" })}
        onBackToHistory={() => {
          dispatch({ type: "SET_PHASE", phase: "input" });
          dispatch({ type: "SET_TAB", tab: "history" });
        }}
      />
    );
  }

  // Exported phase
  if (state.phase === "exported") {
    return (
      <View style={resumeStyles.loadingContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#00D4AA" />
        <Text style={resumeStyles.loadingTitle}>Resume Ready!</Text>
        <Text style={resumeStyles.loadingSubtitle}>
          Your PDF has been saved and is ready to share
        </Text>

        <View style={resumeStyles.buttonRow}>
          <TouchableOpacity style={[resumeStyles.primaryButton, { marginRight: 8 }]} onPress={engine.shareResume}>
            <Text style={resumeStyles.primaryButtonText}>Share Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity style={resumeStyles.ghostButton} onPress={() => dispatch({ type: "RESET_BUILDER" })}>
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
      <View style={resumeStyles.header}>
        <TouchableOpacity
          style={{ position: "absolute", marginLeft: 18, zIndex: 10 }}
          onPress={() => engine.handleBack(() => navigation.goBack())}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={resumeStyles.headerTitle}>Resume Builder</Text>
        <View style={{ width: 24 }} />
      </View>

      {state.inputTab === "history" ? (
        <View style={[resumeStyles.scrollContent, { paddingBottom: bottomInset + 20 }]}>
          <StepIndicator
            currentStep={state.currentStep}
            totalSteps={TOTAL_STEPS}
            stepTitle="Resume History"
          />
          <ResumeHistoryList
            history={state.resumeHistory}
            loading={state.asyncStatus === "loading"}
            onSelect={(item) => dispatch({ type: "LOAD_HISTORY_ITEM", item })}
            onDelete={(id) => engine.deleteResumeHistory(id)}
            onBuildNew={() => dispatch({ type: "SET_TAB", tab: "form" })}
          />
        </View>
      ) : (
        <ScrollView
          style={[resumeStyles.scrollContent]}
          contentContainerStyle={[
            resumeStyles.scrollContentContainer,
            { paddingBottom: bottomInset + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <StepIndicator
            currentStep={state.currentStep}
            totalSteps={TOTAL_STEPS}
            stepTitle={STEP_TITLES[state.currentStep - 1]}
          />
          <StepTitleCard
            icon={STEP_ICONS[state.currentStep - 1]}
            title={STEP_TITLES[state.currentStep - 1]}
            subtitle={STEP_SUBTITLES[state.currentStep - 1]}
          />

          {state.currentStep === 1 && <Step1 state={state.formData} dispatch={dispatch} />}
          {state.currentStep === 2 && <Step2 state={state.formData} dispatch={dispatch} />}
          {state.currentStep === 3 && <Step3 state={state.formData} dispatch={dispatch} />}
          {state.currentStep === 4 && <Step4 state={state.formData} dispatch={dispatch} />}
          {state.currentStep === 5 && <Step5 state={state.formData} dispatch={dispatch} />}

          <NavButtons
            onBack={() => engine.handleBack(() => navigation.goBack())}
            onNext={engine.handleNext}
            canProceed={engine.canProceed()}
            isLastStep={state.currentStep === TOTAL_STEPS}
          />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const Step1 = ({ state, dispatch }: { state: any; dispatch: any }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Full Name"
      icon="person-outline"
      required
      value={state.fullName}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { fullName: v } })}
      placeholder="e.g. Nikhil Sharma"
    />
    <FieldInput
      label="Email Address"
      icon="mail-outline"
      required
      value={state.email}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { email: v } })}
      placeholder="e.g. nikhil@example.com"
      keyboardType="email-address"
    />
    <FieldInput
      label="Phone Number"
      icon="call-outline"
      value={state.phone}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { phone: v } })}
      placeholder="e.g. +91 98765 43210"
      keyboardType="phone-pad"
    />
    <FieldInput
      label="LinkedIn URL"
      icon="logo-linkedin"
      value={state.linkedin}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { linkedin: v } })}
      placeholder="linkedin.com/in/yourname"
    />
    <FieldInput
      label="City / Location"
      icon="location-outline"
      value={state.city}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { city: v } })}
      placeholder="e.g. San Francisco, CA"
    />
  </View>
);

const Step2 = ({ state, dispatch }: { state: any; dispatch: any }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Target Job Title"
      icon="briefcase-outline"
      required
      value={state.targetRole}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { targetRole: v } })}
      placeholder="e.g. Senior Software Engineer, Product Manager"
    />
    <PillSelector
      label="Experience Level"
      options={EXPERIENCE_LEVELS}
      selected={state.experienceLevel}
      onSelect={(v) => dispatch({ type: "UPDATE_FORM", data: { experienceLevel: v } })}
    />
    <PillSelector
      label="Industry"
      options={INDUSTRIES}
      selected={state.industry}
      onSelect={(v) => dispatch({ type: "UPDATE_FORM", data: { industry: v } })}
    />
    <FieldInput
      label="Key Skills"
      icon="code-slash-outline"
      required
      multiline
      value={state.skills}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { skills: v } })}
      placeholder="e.g. React Native, Python, SQL, Project Management..."
    />
  </View>
);

const Step3 = ({ state, dispatch }: { state: any; dispatch: any }) => (
  <View style={resumeStyles.formCard}>
    {state.experienceLevel === "Fresher" && (
      <View style={resumeStyles.infoNote}>
        <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
        <Text style={resumeStyles.infoNoteText}>
          💡 No experience? Add internships, college projects, or part-time work
        </Text>
      </View>
    )}

    {state.experiences.map((exp: any, index: number) => (
      <ExperienceCard
        key={index}
        experience={exp}
        index={index}
        showDelete={state.experiences.length > 1}
        onUpdate={(field, value) => dispatch({ type: "UPDATE_EXPERIENCE", index, field, value })}
        onDelete={() => dispatch({ type: "REMOVE_EXPERIENCE", index })}
      />
    ))}

    {state.experiences.length < 4 && (
      <TouchableOpacity
        style={resumeStyles.addRoleBtn}
        onPress={() => dispatch({ type: "ADD_EXPERIENCE", experience: { jobTitle: "", company: "", duration: "", achievement1: "", achievement2: "" } })}
      >
        <View style={resumeStyles.addRoleBtnInner}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={resumeStyles.addRoleBtnText}>Add Another Role</Text>
        </View>
      </TouchableOpacity>
    )}
  </View>
);

const Step4 = ({ state, dispatch }: { state: any; dispatch: any }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Degree / Qualification"
      icon="school-outline"
      required
      value={state.degree}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { degree: v } })}
      placeholder="e.g. B.Tech Computer Science"
    />
    <FieldInput
      label="Institution Name"
      icon="library-outline"
      required
      value={state.institution}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { institution: v } })}
      placeholder="e.g. IIT Delhi, Stanford University"
    />
    <FieldInput
      label="Year of Completion"
      icon="calendar-outline"
      required
      value={state.graduationYear}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { graduationYear: v } })}
      placeholder="e.g. 2022"
      keyboardType="numeric"
    />
    <FieldInput
      label="Grade / GPA"
      icon="ribbon-outline"
      value={state.grade}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { grade: v } })}
      placeholder="e.g. 8.5 CGPA / 3.8 GPA"
    />
    <FieldInput
      label="Certifications"
      icon="medal-outline"
      multiline
      value={state.certifications}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { certifications: v } })}
      placeholder="e.g. AWS Certified, PMP..."
    />
    <FieldInput
      label="Languages"
      icon="language-outline"
      value={state.languages}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { languages: v } })}
      placeholder="e.g. English (Fluent)"
    />
  </View>
);

const Step5 = ({ state, dispatch }: { state: any; dispatch: any }) => (
  <View style={resumeStyles.formCard}>
    <PillSelector
      label="Resume Tone"
      options={TONES}
      selected={state.tone}
      onSelect={(v) => dispatch({ type: "UPDATE_FORM", data: { tone: v } })}
    />
    <FieldInput
      label="Your Biggest Career Highlight"
      icon="sparkles-outline"
      multiline
      value={state.topAchievement}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { topAchievement: v } })}
      placeholder="e.g. Built an app with 10K users..."
    />
    <FieldInput
      label="Target Companies"
      icon="rocket-outline"
      value={state.targetCompanies}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { targetCompanies: v } })}
      placeholder="e.g. Google, MNCs"
    />
    <FieldInput
      label="Special Instructions"
      icon="settings-outline"
      multiline
      value={state.specialInstructions}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { specialInstructions: v } })}
      placeholder="e.g. Keep it to 1 page..."
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
