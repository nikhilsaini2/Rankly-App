import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect } from "react";
import {
  Alert,
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
import { validateStep } from "../utils/validation";

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <Text style={{ fontSize: 12, color: colors.error, marginTop: 4, marginLeft: 2 }}>
      {message}
    </Text>
  ) : null;

const Step1 = ({ state, dispatch, errors }: { state: any; dispatch: any; errors: Record<string, string> }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Full Name"
      icon="person-outline"
      required
      value={state.fullName}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { fullName: v } })}
      placeholder="e.g. Nikhil Sharma"
    />
    <FieldError message={errors.fullName} />
    <FieldInput
      label="Email Address"
      icon="mail-outline"
      required
      value={state.email}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { email: v } })}
      placeholder="e.g. nikhil@example.com"
      keyboardType="email-address"
    />
    <FieldError message={errors.email} />
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
    <FieldError message={errors.linkedin} />
    <FieldInput
      label="City / Location"
      icon="location-outline"
      value={state.city}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { city: v } })}
      placeholder="e.g. San Francisco, CA"
    />
  </View>
);

const Step2 = ({ state, dispatch, errors }: { state: any; dispatch: any; errors: Record<string, string> }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Target Job Title"
      icon="briefcase-outline"
      required
      value={state.targetRole}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { targetRole: v } })}
      placeholder="e.g. Senior Software Engineer, Product Manager"
    />
    <FieldError message={errors.targetRole} />
    <PillSelector
      label="Experience Level"
      options={EXPERIENCE_LEVELS}
      selected={state.experienceLevel}
      onSelect={(v) => dispatch({ type: "UPDATE_FORM", data: { experienceLevel: v } })}
    />
    <FieldError message={errors.experienceLevel} />
    <PillSelector
      label="Industry"
      options={INDUSTRIES}
      selected={state.industry}
      onSelect={(v) => dispatch({ type: "UPDATE_FORM", data: { industry: v } })}
    />
    <FieldError message={errors.industry} />
    <FieldInput
      label="Key Skills"
      icon="code-slash-outline"
      required
      multiline
      value={state.skills}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { skills: v } })}
      placeholder="e.g. React Native, Python, SQL, Project Management..."
    />
    <FieldError message={errors.skills} />
  </View>
);

const Step3 = ({ state, dispatch, errors }: { state: any; dispatch: any; errors: Record<string, string> }) => (
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
      <View key={index}>
        <ExperienceCard
          experience={exp}
          index={index}
          showDelete={state.experiences.length > 1}
          onUpdate={(field, value) => dispatch({ type: "UPDATE_EXPERIENCE", index, field, value })}
          onDelete={() => dispatch({ type: "REMOVE_EXPERIENCE", index })}
        />
        {index === 0 && (
          <>
            <FieldError message={errors['experiences[0].jobTitle']} />
            <FieldError message={errors['experiences[0].company']} />
            <FieldError message={errors['experiences[0].duration']} />
          </>
        )}
      </View>
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

const Step4 = ({ state, dispatch, errors }: { state: any; dispatch: any; errors: Record<string, string> }) => (
  <View style={resumeStyles.formCard}>
    <FieldInput
      label="Degree / Qualification"
      icon="school-outline"
      required
      value={state.degree}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { degree: v } })}
      placeholder="e.g. B.Tech Computer Science"
    />
    <FieldError message={errors.degree} />
    <FieldInput
      label="Institution Name"
      icon="library-outline"
      required
      value={state.institution}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { institution: v } })}
      placeholder="e.g. IIT Delhi, Stanford University"
    />
    <FieldError message={errors.institution} />
    <FieldInput
      label="Year of Completion"
      icon="calendar-outline"
      required
      value={state.graduationYear}
      onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { graduationYear: v } })}
      placeholder="e.g. 2022"
      keyboardType="numeric"
    />
    <FieldError message={errors.graduationYear} />
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

const Step5 = ({ state, dispatch, errors }: { state: any; dispatch: any; errors: Record<string, string> }) => (
  <View style={resumeStyles.formCard}>
    <PillSelector
      label="Resume Tone"
      options={TONES}
      selected={state.tone}
      onSelect={(v) => dispatch({ type: "UPDATE_FORM", data: { tone: v } })}
    />
    <FieldError message={errors.tone} />
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

const MemoizedStep1 = React.memo(Step1);
const MemoizedStep2 = React.memo(Step2);
const MemoizedStep3 = React.memo(Step3);
const MemoizedStep4 = React.memo(Step4);
const MemoizedStep5 = React.memo(Step5);

export default function ResumeBuilderScreen() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;
  const navigation = useNavigation();
  const engine = useResumeEngine();
  const { state, dispatch } = engine;

  // Per-step inline validation errors — only shown after user taps Next
  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = React.useState(false);

  // Recompute errors whenever form data or step changes, but only display if showErrors is true
  const currentErrors = React.useMemo(
    () => validateStep(state.currentStep, state.formData),
    [state.currentStep, state.formData]
  );

  // Clear shown errors when user moves to a new step
  useEffect(() => {
    setShowErrors(false);
    setStepErrors({});
  }, [state.currentStep]);

  // State for session restoration modal
  const [showRestoreModal, setShowRestoreModal] = React.useState(false);

  useEffect(() => {
    async function checkDraft() {
      await new Promise(r => setTimeout(r, 200));
      const hasDraft = await engine.restoreDraft();
      if (hasDraft) {
        setShowRestoreModal(true);
      }
    }
    
    if (state.currentStep === 1 && !state.formData.fullName && state.inputTab === "form") {
       checkDraft();
    }
  }, []);

  const renderRestoreModal = () => {
    if (!showRestoreModal) return null;

    return (
      <View style={[resumeStyles.loadingContainer, { position: 'absolute', zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.85)' }]}>
        <View style={[resumeStyles.formCard, { width: '85%', padding: 24, alignItems: 'center' }]}>
          <Ionicons name="time-outline" size={48} color={colors.accent} />
          <Text style={[resumeStyles.loadingTitle, { marginTop: 16 }]}>Resume your work?</Text>
          <Text style={[resumeStyles.loadingSubtitle, { textAlign: 'center', marginBottom: 24 }]}>
             You have a saved draft from your previous session.
          </Text>
          
          <TouchableOpacity 
            style={[resumeStyles.primaryButton, { width: '100%', marginBottom: 12 }]} 
            onPress={() => setShowRestoreModal(false)}
          >
            <Text style={resumeStyles.primaryButtonText}>Resume Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[resumeStyles.ghostButton, { width: '100%' }]} 
            onPress={() => {
              engine.clearDraft();
              setShowRestoreModal(false);
            }}
          >
            <Text style={resumeStyles.ghostButtonText}>Start Fresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        if (state.asyncStatus === "error") {
          dispatch({ type: "RESET_BUILDER" });
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
    }, [state.phase, state.currentStep, state.asyncStatus, engine, dispatch])
  );

  // Error State Component
  const renderErrorState = () => {
    if (!state.error) return null;

    return (
      <View style={resumeStyles.loadingContainer}>
        <Ionicons 
          name={state.error.type === 'network' ? "cloud-offline-outline" : "alert-circle-outline"} 
          size={64} 
           color={colors.error} 
        />
        <Text style={resumeStyles.loadingTitle}>{state.error.type === 'validation' ? 'Validation Error' : 'Oops! Something went wrong'}</Text>
        <Text style={[resumeStyles.loadingSubtitle, { color: colors.textSecondary }]}>
          {state.error.message}
        </Text>
        
        <View style={[resumeStyles.buttonRow, { marginTop: 24 }]}>
          {state.error.retryAction && (
             <TouchableOpacity 
               style={[resumeStyles.primaryButton, { marginRight: 8 }]} 
               onPress={() => {
                 if (state.error?.retryAction === 'generate') engine.buildResume();
                 if (state.error?.retryAction === 'export') engine.exportPDF();
               }}
             >
               <Text style={resumeStyles.primaryButtonText}>Retry Action</Text>
             </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={resumeStyles.ghostButton} 
            onPress={() => dispatch({ type: "RESET_BUILDER" })}
          >
            <Text style={resumeStyles.ghostButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Error Phase
  if (state.asyncStatus === "error") {
    return renderErrorState();
  }

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
      {renderRestoreModal()}
      <View style={[resumeStyles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={{ position: "absolute", left: 18, top: insets.top + 12, zIndex: 10 }}
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
            loading={state.asyncStatus === "loading" && state.resumeHistory.length === 0}
            onSelect={(item) => dispatch({ type: "LOAD_HISTORY_ITEM", item })}
            onDelete={(id) => engine.deleteResumeHistory(id)}
            onBuildNew={() => dispatch({ type: "SET_TAB", tab: "form" })}
            onLoadMore={engine.loadMoreHistory}
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

          {state.currentStep === 1 && <MemoizedStep1 state={state.formData} dispatch={dispatch} errors={showErrors ? currentErrors : {}} />}
          {state.currentStep === 2 && <MemoizedStep2 state={state.formData} dispatch={dispatch} errors={showErrors ? currentErrors : {}} />}
          {state.currentStep === 3 && <MemoizedStep3 state={state.formData} dispatch={dispatch} errors={showErrors ? currentErrors : {}} />}
          {state.currentStep === 4 && <MemoizedStep4 state={state.formData} dispatch={dispatch} errors={showErrors ? currentErrors : {}} />}
          {state.currentStep === 5 && <MemoizedStep5 state={state.formData} dispatch={dispatch} errors={showErrors ? currentErrors : {}} />}

          <NavButtons
            onBack={() => engine.handleBack(() => navigation.goBack())}
            onNext={() => {
              if (!engine.canProceed()) {
                setShowErrors(true);
                setStepErrors(currentErrors);
              } else {
                setShowErrors(false);
                engine.handleNext();
              }
            }}
            canProceed={engine.canProceed()}
            isLastStep={state.currentStep === TOTAL_STEPS}
          />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

