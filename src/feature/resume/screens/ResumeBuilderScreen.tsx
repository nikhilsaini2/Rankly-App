import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Modal,
  Platform,
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
import { useToast } from "../../../components/atoms/Toast";
import { KeyboardAwareScreenScroll } from "../../../components/layouts/KeyboardAwareScreenScroll";
import { useAppTheme } from "../../../theme/useAppTheme";
import type { RootStackParamList } from "../../../types/navigation.types";
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
  isFieldRequired,
} from "../constants/resume.constants";
import { useResumeEngine } from "../hooks/useResumeEngine";
import { createResumeStyles } from "../styles/resume.styles";
import { validateStep } from "../utils/validation";

const FieldError = React.memo(({ message }: { message?: string }) => {
  const theme = useAppTheme();
  if (!message) return null;
  return (
    <Text
      style={{
        fontSize: 11,
        color: theme.error,
        marginTop: 4,
        marginBottom: 0,
        marginLeft: 2,
        lineHeight: 14,
      }}
    >
      {message}
    </Text>
  );
});

type StepProps = {
  state: any;
  dispatch: any;
  errors: Record<string, string>;
  markTouched: (f: string) => void;
};

const Step1 = React.memo(({ state, dispatch, errors, markTouched }: StepProps) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);
  return (
    <View style={resumeStyles.formCard}>
      <FieldInput
        label="Full Name"
        icon="person-outline"
        required={isFieldRequired("fullName")}
        value={state.fullName}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { fullName: v } });
          markTouched("fullName");
        }}
        onBlur={() => markTouched("fullName")}
        placeholder="Nikhil Sharma"
        accessibilityLabel="Full name"
        accessibilityHint="Enter your full name"
        autoComplete="name"
        hasError={!!errors.fullName}
        errorMessage={errors.fullName}
      />
      <FieldInput
        label="Email Address"
        icon="mail-outline"
        required={isFieldRequired("email")}
        value={state.email}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { email: v } });
          markTouched("email");
        }}
        onBlur={() => markTouched("email")}
        placeholder="nikhil@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        accessibilityLabel="Email address"
        accessibilityHint="Enter your email address"
        hasError={!!errors.email}
        errorMessage={errors.email}
      />
      <FieldInput
        label="Phone Number"
        icon="call-outline"
        value={state.phone}
        onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { phone: v } })}
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
        autoComplete="tel"
        accessibilityLabel="Phone number"
      />
      <FieldInput
        label="LinkedIn URL"
        icon="logo-linkedin"
        value={state.linkedin}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { linkedin: v } });
          markTouched("linkedin");
        }}
        onBlur={() => markTouched("linkedin")}
        placeholder="https://linkedin.com/in/yourname"
        autoCapitalize="none"
        autoComplete="url"
        accessibilityLabel="LinkedIn profile URL"
        hasError={!!errors.linkedin}
        errorMessage={errors.linkedin}
      />
      <FieldInput
        label="City / Location"
        icon="location-outline"
        value={state.city}
        onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { city: v } })}
        placeholder="San Francisco, CA"
        accessibilityLabel="City or location"
      />
    </View>
  );
});

const Step2 = React.memo(({ state, dispatch, errors, markTouched }: StepProps) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);

  /** True when industry is custom text (not one of the preset pills including Other). */
  const isOtherIndustry =
    state.industry !== "" && !INDUSTRIES.includes(state.industry);
  const industryPillValue = isOtherIndustry ? "Other" : state.industry;

  return (
    <View style={resumeStyles.formCard}>
      <FieldInput
        label="Target Job Title"
        icon="briefcase-outline"
        required={isFieldRequired("targetRole")}
        value={state.targetRole}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { targetRole: v } });
          markTouched("targetRole");
        }}
        onBlur={() => markTouched("targetRole")}
        placeholder="Senior Software Engineer"
        accessibilityLabel="Target job title"
        hasError={!!errors.targetRole}
        errorMessage={errors.targetRole}
      />
      <PillSelector
        label="Experience Level"
        options={EXPERIENCE_LEVELS}
        selected={state.experienceLevel}
        required={isFieldRequired("experienceLevel")}
        onSelect={(v) => {
          if (v === state.experienceLevel) return;
          dispatch({ type: "UPDATE_FORM", data: { experienceLevel: v } });
          markTouched("experienceLevel");
        }}
      />
      <FieldError message={errors.experienceLevel} />
      <PillSelector
        label="Industry"
        options={INDUSTRIES}
        selected={industryPillValue}
        required={isFieldRequired("industry")}
        onSelect={(v) => {
          if (v === industryPillValue) return;
          if (v === "Other") {
            dispatch({ type: "UPDATE_FORM", data: { industry: "Other" } });
          } else {
            dispatch({ type: "UPDATE_FORM", data: { industry: v } });
          }
          markTouched("industry");
        }}
      />
      {!!errors.industry && industryPillValue !== "Other" && (
        <FieldError message={errors.industry} />
      )}
      {industryPillValue === "Other" && (
        <FieldInput
          label="Specify Industry"
          icon="create-outline"
          required={isFieldRequired("industry")}
          value={isOtherIndustry ? state.industry : ""}
          onChangeText={(v) => {
            dispatch({
              type: "UPDATE_FORM",
              data: { industry: v.trim() === "" ? "Other" : v },
            });
            markTouched("industry");
          }}
          onBlur={() => markTouched("industry")}
          placeholder="Consulting, E-commerce, EdTech..."
          accessibilityLabel="Specify your industry"
          hasError={!!errors.industry}
          errorMessage={errors.industry}
        />
      )}
      <FieldInput
        label="Key Skills"
        icon={null}
        required={isFieldRequired("skills")}
        multiline
        value={state.skills}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { skills: v } });
          markTouched("skills");
        }}
        onBlur={() => markTouched("skills")}
        placeholder="React Native, Python, SQL..."
        accessibilityLabel="Key skills"
        accessibilityHint="List your main skills separated by commas"
        hasError={!!errors.skills}
        errorMessage={errors.skills}
      />
    </View>
  );
});

const Step3 = React.memo(({ state, dispatch, errors, markTouched }: StepProps) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);
  return (
    <View style={resumeStyles.formCard}>
      {state.experienceLevel === "Fresher" && (
        <View style={resumeStyles.infoNote} accessibilityRole="text">
          <Ionicons name="information-circle-outline" size={16} color={theme.accent} />
          <Text style={resumeStyles.infoNoteText}>
            No experience? Add internships, college projects, or part-time work
          </Text>
        </View>
      )}
      {state.experiences.map((exp: any, index: number) => (
        <View key={index}>
          <ExperienceCard
            experience={exp}
            index={index}
            showDelete={state.experiences.length > 1}
            errors={errors}
            fieldsRequired={state.experienceLevel !== "Fresher"}
            onUpdate={(field: any, value: any) => {
              dispatch({ type: "UPDATE_EXPERIENCE", index, field, value });
              markTouched(`experiences[${index}].${field}`);
            }}
            onBlur={(field: any) => {
              markTouched(`experiences[${index}].${field}`);
            }}
            onDelete={() => dispatch({ type: "REMOVE_EXPERIENCE", index })}
          />
        </View>
      ))}
      {state.experiences.length < 4 && (
        <TouchableOpacity
          style={resumeStyles.addRoleBtn}
          onPress={() =>
            dispatch({
              type: "ADD_EXPERIENCE",
              experience: {
                jobTitle: "",
                company: "",
                duration: "",
                achievement1: "",
                achievement2: "",
              },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Add another work experience"
        >
          <View style={resumeStyles.addRoleBtnInner}>
            <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
            <Text style={resumeStyles.addRoleBtnText}>Add Another Role</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});

const Step4 = React.memo(({ state, dispatch, errors, markTouched }: StepProps) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);
  return (
    <View style={resumeStyles.formCard}>
      <FieldInput
        label="Degree / Qualification"
        icon="school-outline"
        required={isFieldRequired("degree")}
        value={state.degree}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { degree: v } });
          markTouched("degree");
        }}
        onBlur={() => markTouched("degree")}
        placeholder="B.Tech Computer Science"
        accessibilityLabel="Degree or qualification"
        hasError={!!errors.degree}
        errorMessage={errors.degree}
      />
      <FieldInput
        label="Institution Name"
        icon="library-outline"
        required={isFieldRequired("institution")}
        value={state.institution}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { institution: v } });
          markTouched("institution");
        }}
        onBlur={() => markTouched("institution")}
        placeholder="IIT Delhi, Stanford University"
        accessibilityLabel="Institution name"
        hasError={!!errors.institution}
        errorMessage={errors.institution}
      />
      <FieldInput
        label="Year of Completion"
        icon="calendar-outline"
        required={isFieldRequired("graduationYear")}
        value={state.graduationYear}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { graduationYear: v } });
          markTouched("graduationYear");
        }}
        onBlur={() => markTouched("graduationYear")}
        placeholder="2022"
        keyboardType="numeric"
        accessibilityLabel="Graduation year"
        hasError={!!errors.graduationYear}
        errorMessage={errors.graduationYear}
      />
      <FieldInput
        label="Grade / GPA"
        icon="ribbon-outline"
        value={state.grade}
        onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { grade: v } })}
        placeholder="8.5 CGPA / 3.8 GPA"
        accessibilityLabel="Grade or GPA"
      />
      <FieldInput
        label="Certifications"
        icon="medal-outline"
        multiline
        value={state.certifications}
        onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { certifications: v } })}
        placeholder="AWS Certified, PMP..."
        accessibilityLabel="Certifications"
      />
      <FieldInput
        label="Languages"
        icon="language-outline"
        value={state.languages}
        onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { languages: v } })}
        placeholder="English (Fluent)"
        accessibilityLabel="Languages spoken"
      />
    </View>
  );
});

const Step5 = React.memo(({ state, dispatch, errors, markTouched }: StepProps) => {
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);
  return (
    <View style={resumeStyles.formCard}>
      <PillSelector
        label="Resume Tone"
        options={TONES}
        selected={state.tone}
        required={isFieldRequired("tone")}
        onSelect={(v) => {
          if (v === state.tone) return;
          dispatch({ type: "UPDATE_FORM", data: { tone: v } });
          markTouched("tone");
        }}
      />
      <FieldError message={errors.tone} />
      <FieldInput
        label="Your Biggest Career Highlight"
        icon="sparkles-outline"
        multiline
        value={state.topAchievement}
        onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { topAchievement: v } })}
        placeholder="Built an app with 10K users..."
        accessibilityLabel="Top career achievement"
      />
      <FieldInput
        label="Target Companies"
        icon="rocket-outline"
        value={state.targetCompanies}
        onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { targetCompanies: v } })}
        placeholder="Google, MNCs"
        accessibilityLabel="Target companies"
      />
      <FieldInput
        label="Special Instructions"
        icon="settings-outline"
        multiline
        value={state.specialInstructions}
        onChangeText={(v) => dispatch({ type: "UPDATE_FORM", data: { specialInstructions: v } })}
        placeholder="Keep it to 1 page..."
        accessibilityLabel="Special instructions for resume generation"
      />
    </View>
  );
});

const NavButtons = React.memo(
  ({
    onBack,
    onNext,
    canProceed,
    isLastStep,
    isBuilding,
  }: {
    onBack: () => void;
    onNext: () => void;
    canProceed: boolean;
    isLastStep: boolean;
    isBuilding: boolean;
  }) => {
    const theme = useAppTheme();
    const resumeStyles = createResumeStyles(theme);
    return (
      <View style={resumeStyles.navButtons}>
        <TouchableOpacity
          style={[
            resumeStyles.nextButton,
            (!canProceed || isBuilding) && resumeStyles.nextButtonDisabled,
          ]}
          onPress={onNext}
          disabled={!canProceed || isBuilding}
          accessibilityRole="button"
          accessibilityLabel={isLastStep ? "Build resume" : "Go to next step"}
          accessibilityState={{ disabled: !canProceed || isBuilding }}
        >
          {isBuilding && isLastStep ? (
            <ActivityIndicator color={theme.onPrimary} size="small" />
          ) : (
            <>
              <Text style={resumeStyles.nextButtonText}>
                {isLastStep ? "✨ Build Resume" : "Next"}
              </Text>
              {!isLastStep && (
                <Ionicons name="arrow-forward" size={18} color={theme.onPrimary} />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  },
);

const RestoreModal = React.memo(
  ({ onResume, onStartFresh }: { onResume: () => void; onStartFresh: () => void }) => {
    const theme = useAppTheme();
    const scale = useSharedValue(0.88);
    const opacity = useSharedValue(0);

    useEffect(() => {
      scale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.back(1.4)) });
      opacity.value = withTiming(1, { duration: 180 });
    }, []);

    const cardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    return (
      <Modal
        transparent
        animationType="none"
        visible
        statusBarTranslucent
        onRequestClose={onResume}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.72)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
          accessibilityViewIsModal
          accessibilityLabel="Resume draft found"
        >
          <Animated.View
            style={[
              {
                width: "100%",
                maxWidth: 380,
                backgroundColor: theme.surface,
                borderRadius: 20,
                paddingVertical: 28,
                paddingHorizontal: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              },
              cardStyle,
            ]}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.accent + "18",
                borderWidth: 1,
                borderColor: theme.accent + "30",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="time-outline" size={32} color={theme.accent} />
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: theme.textPrimary,
                textAlign: "center",
                marginBottom: 8,
                letterSpacing: -0.3,
              }}
            >
              Resume your work?
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: theme.textSecondary,
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 24,
                paddingHorizontal: 8,
              }}
            >
              You have a saved draft from your previous session.
            </Text>

            <TouchableOpacity
              style={{
                width: "100%",
                height: 50,
                backgroundColor: theme.primary,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
              onPress={onResume}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Resume saved draft"
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.onPrimary }}>
                Resume Draft
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                width: "100%",
                height: 50,
                backgroundColor: "transparent",
                borderRadius: 13,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={onStartFresh}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Start new resume"
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: theme.textSecondary }}>
                Start Fresh
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  },
);

export default function ResumeBuilderScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const resumeStyles = createResumeStyles(theme);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const engine = useResumeEngine();
  const { state, dispatch } = engine;
  const toast = useToast();

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const hasCheckedDraft = useRef(false);
  const hasUserInteracted = useRef(false);
  const [keyboardScrollPad, setKeyboardScrollPad] = useState(0);

  useEffect(() => {
    const onShow = Keyboard.addListener("keyboardDidShow", (e) => {
      const h = Math.round(e.endCoordinates.height);
      const ratio = Platform.OS === "android" ? 0.7 : 0.4;
      const cap = Platform.OS === "android" ? 420 : 300;
      setKeyboardScrollPad(Math.min(cap, Math.max(96, Math.round(h * ratio))));
    });
    const onHide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardScrollPad(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    if (hasCheckedDraft.current) return;
    hasCheckedDraft.current = true;

    let cancelled = false;

    (async () => {
      try {
        if (hasUserInteracted.current) return;
        const hasMeaningfulDraft = await engine.peekDraft();
        if (cancelled) return;
        if (hasMeaningfulDraft && !hasUserInteracted.current) {
          setShowRestoreModal(true);
        }
      } catch (err) {
        console.warn("[ResumeBuilder] Draft check failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleResumeDraft = useCallback(async () => {
    await engine.applyDraft();
    setShowRestoreModal(false);
  }, [engine]);

  const handleStartFresh = useCallback(() => {
    engine.clearDraft();
    setShowRestoreModal(false);
    setShowErrors(false);
  }, [engine]);

  const [showErrors, setShowErrors] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const currentErrors = useMemo(
    () => validateStep(state.currentStep, state.formData),
    [state.currentStep, state.formData],
  );

  const visibleErrors = useMemo(() => {
    if (showErrors) return currentErrors;
    const filtered: Record<string, string> = {};
    for (const key of touchedFields) {
      if (currentErrors[key]) filtered[key] = currentErrors[key];
    }
    return filtered;
  }, [showErrors, currentErrors, touchedFields]);

  const markTouched = useCallback((field: string) => {
    setTouchedFields((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  useEffect(() => {
    setShowErrors(false);
    setTouchedFields(new Set());
  }, [state.currentStep]);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    if (state.asyncStatus === "loading" && state.phase === "loading") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
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

  const goHomeAndReset = useCallback(() => {
    engine.clearDraft();
    dispatch({ type: "RESET_BUILDER" });
    navigation.navigate("Tabs");
  }, [engine, dispatch, navigation]);

  const handleHeaderBack = useCallback(() => {
    if (state.phase === "preview" || state.phase === "exported") {
      if (state.selectedResume) {
        dispatch({ type: "SET_PHASE", phase: "input" });
        dispatch({ type: "SET_TAB", tab: "history" });
      } else {
        goHomeAndReset();
      }
      return;
    }
    engine.handleBack(() => navigation.goBack());
  }, [state.phase, state.selectedResume, engine, dispatch, navigation, goHomeAndReset]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (state.phase === "exported") {
          goHomeAndReset();
          return true;
        }
        if (state.phase === "preview") {
          if (state.selectedResume) {
            dispatch({ type: "SET_PHASE", phase: "input" });
            dispatch({ type: "SET_TAB", tab: "history" });
          } else {
            goHomeAndReset();
          }
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
    }, [
      state.phase,
      state.currentStep,
      state.asyncStatus,
      state.selectedResume,
      engine,
      dispatch,
      goHomeAndReset,
    ]),
  );

  const handleNext = useCallback(() => {
    if (!engine.canProceed()) {
      setShowErrors(true);
    } else {
      setShowErrors(false);
      engine.handleNext();
    }
  }, [engine]);

  /** Single place for step branches + shared scroll children — avoids remount/layout fights with keyboard. */
  const renderResumeBuilderSteps = (): React.ReactNode => {
    const stepProps = {
      state: state.formData,
      dispatch,
      errors: visibleErrors,
      markTouched,
    };
    switch (state.currentStep) {
      case 1:
        return <Step1 {...stepProps} />;
      case 2:
        return <Step2 {...stepProps} />;
      case 3:
        return <Step3 {...stepProps} />;
      case 4:
        return <Step4 {...stepProps} />;
      case 5:
        return <Step5 {...stepProps} />;
      default:
        return null;
    }
  };

  const resumeFormScrollPaddingBottom =
    12 + Math.max(0, 8 - insets.bottom);
  const resumeFormDynamicPaddingBottom =
    resumeFormScrollPaddingBottom + keyboardScrollPad;

  const stepContent = (
    <>
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
      {renderResumeBuilderSteps()}
      <NavButtons
        onBack={() => engine.handleBack(() => navigation.goBack())}
        onNext={handleNext}
        canProceed={engine.canProceed()}
        isLastStep={state.currentStep === TOTAL_STEPS}
        isBuilding={state.currentStep === TOTAL_STEPS && state.asyncStatus === "loading"}
      />
    </>
  );

  const resumeFormScrollView = (
    <KeyboardAwareScreenScroll
      style={{ flex: 1 }}
      autoScrollToFocusedInputOnKeyboard
      keyboardFocusedInputExtraOffset={96}
      contentContainerStyle={[
        resumeStyles.scrollContentContainer,
        {
          flexGrow: 1,
          paddingBottom: resumeFormDynamicPaddingBottom,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {stepContent}
    </KeyboardAwareScreenScroll>
  );

  if (state.asyncStatus === "error" && state.error) {
    return (
      <View style={[resumeStyles.loadingContainer, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
        <Ionicons
          name={state.error.type === "network" ? "cloud-offline-outline" : "alert-circle-outline"}
          size={64}
          color={theme.error}
        />
        <Text style={resumeStyles.loadingTitle}>
          {state.error.type === "validation" ? "Check your inputs" : "Something went wrong"}
        </Text>
        <Text style={[resumeStyles.loadingSubtitle, { color: theme.textSecondary }]}>
          {state.error.message}
        </Text>
        <View style={{ gap: 12, width: "100%" }}>
          {state.error.retryAction && (
            <TouchableOpacity
              style={resumeStyles.primaryButton}
              onPress={() => {
                if (state.error?.retryAction === "generate") engine.buildResume();
                if (state.error?.retryAction === "export")
                  engine.exportAndShare(() => toast("PDF ready to share ✓", "success"));
              }}
            >
              <Text style={resumeStyles.primaryButtonText}>Retry</Text>
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
  }

  if (state.phase === "loading" && state.asyncStatus === "loading") {
    return (
      <View style={[resumeStyles.loadingContainer, { paddingBottom: insets.bottom }]}>
        <View style={resumeStyles.loadingIconWrapper}>
          <Animated.View style={pulseStyle}>
            <Ionicons name="document-text-outline" size={64} color={theme.accent} />
          </Animated.View>
        </View>
        <Text style={resumeStyles.loadingTitle}>Building your resume...</Text>
        <Text style={resumeStyles.loadingSubtitle}>
          {LOADING_MESSAGES[state.loadingMessage]}
        </Text>
        <View style={resumeStyles.loadingDots}>
          {[0, 1, 2].map((i) => (
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

  if (state.phase === "preview" && state.generatedResume) {
    return (
      <ResumePreview
        formData={state.formData}
        generatedResume={state.generatedResume}
        isHistoryView={!!state.selectedResume}
        processing={state.phase === "preview" && state.asyncStatus === "loading"}
        onAction={() =>
          engine.exportAndShare(
            () => toast("PDF ready to share ✓", "success"),
            (msg) => toast(msg, "error"),
          )
        }
        onReset={goHomeAndReset}
        onBackToHistory={() => {
          dispatch({ type: "SET_PHASE", phase: "input" });
          dispatch({ type: "SET_TAB", tab: "history" });
        }}
      />
    );
  }

  return (
    <View style={resumeStyles.container}>
      {showRestoreModal && (
        <RestoreModal onResume={handleResumeDraft} onStartFresh={handleStartFresh} />
      )}

      <View style={resumeStyles.header}>
        <TouchableOpacity
          style={{ position: "absolute", left: 16, zIndex: 10, padding: 4 }}
          onPress={handleHeaderBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={resumeStyles.headerTitle}>Resume Builder</Text>
      </View>

      {state.inputTab === "history" ? (
        <View
          style={[
            resumeStyles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 20 },
          ]}
        >
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
        resumeFormScrollView
      )}
    </View>
  );
}