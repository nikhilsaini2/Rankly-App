import { Ionicons } from "@expo/vector-icons";
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
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
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
  isFieldRequired,
} from "../constants/resume.constants";
import { useResumeEngine } from "../hooks/useResumeEngine";
import { resumeStyles } from "../styles/resume.styles";
import { validateStep } from "../utils/validation";

// ─── Field error ─────────────────────────────────────────────────────────────
const FieldError = React.memo(({ message }: { message?: string }) =>
  message ? (
    <Text
      style={{ fontSize: 12, color: colors.error, marginTop: 3, marginLeft: 2 }}
    >
      {message}
    </Text>
  ) : null,
);

// ─── Step forms ──────────────────────────────────────────────────────────────
type StepProps = {
  state: any;
  dispatch: any;
  errors: Record<string, string>;
  markTouched: (f: string) => void;
};

const Step1 = React.memo(
  ({ state, dispatch, errors, markTouched }: StepProps) => (
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
        placeholder="e.g. Nikhil Sharma"
        accessibilityLabel="Full name"
        accessibilityHint="Enter your full name"
        autoComplete="name"
      />
      <FieldError message={errors.fullName} />
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
        placeholder="e.g. nikhil@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        accessibilityLabel="Email address"
        accessibilityHint="Enter your email address"
      />
      <FieldError message={errors.email} />
      <FieldInput
        label="Phone Number"
        icon="call-outline"
        value={state.phone}
        onChangeText={(v) =>
          dispatch({ type: "UPDATE_FORM", data: { phone: v } })
        }
        placeholder="e.g. +91 98765 43210"
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
      />
      <FieldError message={errors.linkedin} />
      <FieldInput
        label="City / Location"
        icon="location-outline"
        value={state.city}
        onChangeText={(v) =>
          dispatch({ type: "UPDATE_FORM", data: { city: v } })
        }
        placeholder="e.g. San Francisco, CA"
        accessibilityLabel="City or location"
      />
    </View>
  ),
);

const Step2 = React.memo(
  ({ state, dispatch, errors, markTouched }: StepProps) => (
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
        placeholder="e.g. Senior Software Engineer"
        accessibilityLabel="Target job title"
      />
      <FieldError message={errors.targetRole} />
      <PillSelector
        label="Experience Level"
        options={EXPERIENCE_LEVELS}
        selected={state.experienceLevel}
        required={isFieldRequired("experienceLevel")}
        onSelect={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { experienceLevel: v } });
          markTouched("experienceLevel");
        }}
      />
      <FieldError message={errors.experienceLevel} />
      <PillSelector
        label="Industry"
        options={INDUSTRIES}
        selected={state.industry}
        required={isFieldRequired("industry")}
        onSelect={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { industry: v } });
          markTouched("industry");
        }}
      />
      <FieldError message={errors.industry} />
      <FieldInput
        label="Key Skills"
        icon="code-slash-outline"
        required={isFieldRequired("skills")}
        multiline
        value={state.skills}
        onChangeText={(v) => {
          dispatch({ type: "UPDATE_FORM", data: { skills: v } });
          markTouched("skills");
        }}
        onBlur={() => markTouched("skills")}
        placeholder="e.g. React Native, Python, SQL..."
        accessibilityLabel="Key skills"
        accessibilityHint="List your main skills separated by commas"
      />
      <FieldError message={errors.skills} />
    </View>
  ),
);

const Step3 = React.memo(
  ({ state, dispatch, errors, markTouched }: StepProps) => (
    <View style={resumeStyles.formCard}>
      {state.experienceLevel === "Fresher" && (
        <View style={resumeStyles.infoNote} accessibilityRole="text">
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.accent}
          />
          <Text style={resumeStyles.infoNoteText}>
            💡 No experience? Add internships, college projects, or part-time
            work
          </Text>
        </View>
      )}
      {state.experiences.map((exp: any, index: number) => (
        <View key={index}>
          <ExperienceCard
            experience={exp}
            index={index}
            showDelete={state.experiences.length > 1}
            onUpdate={(field: any, value: any) => {
              dispatch({ type: "UPDATE_EXPERIENCE", index, field, value });
              if (index === 0) markTouched(`experiences[0].${field}`);
            }}
            onDelete={() => dispatch({ type: "REMOVE_EXPERIENCE", index })}
          />
          {index === 0 && (
            <>
              <FieldError message={errors["experiences[0].jobTitle"]} />
              <FieldError message={errors["experiences[0].company"]} />
              <FieldError message={errors["experiences[0].duration"]} />
            </>
          )}
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
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={colors.accent}
            />
            <Text style={resumeStyles.addRoleBtnText}>Add Another Role</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  ),
);

const Step4 = React.memo(
  ({ state, dispatch, errors, markTouched }: StepProps) => (
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
        placeholder="e.g. B.Tech Computer Science"
        accessibilityLabel="Degree or qualification"
      />
      <FieldError message={errors.degree} />
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
        placeholder="e.g. IIT Delhi, Stanford University"
        accessibilityLabel="Institution name"
      />
      <FieldError message={errors.institution} />
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
        placeholder="e.g. 2022"
        keyboardType="numeric"
        accessibilityLabel="Graduation year"
      />
      <FieldError message={errors.graduationYear} />
      <FieldInput
        label="Grade / GPA"
        icon="ribbon-outline"
        value={state.grade}
        onChangeText={(v) =>
          dispatch({ type: "UPDATE_FORM", data: { grade: v } })
        }
        placeholder="e.g. 8.5 CGPA / 3.8 GPA"
        accessibilityLabel="Grade or GPA"
      />
      <FieldInput
        label="Certifications"
        icon="medal-outline"
        multiline
        value={state.certifications}
        onChangeText={(v) =>
          dispatch({ type: "UPDATE_FORM", data: { certifications: v } })
        }
        placeholder="e.g. AWS Certified, PMP..."
        accessibilityLabel="Certifications"
      />
      <FieldInput
        label="Languages"
        icon="language-outline"
        value={state.languages}
        onChangeText={(v) =>
          dispatch({ type: "UPDATE_FORM", data: { languages: v } })
        }
        placeholder="e.g. English (Fluent)"
        accessibilityLabel="Languages spoken"
      />
    </View>
  ),
);

const Step5 = React.memo(
  ({ state, dispatch, errors, markTouched }: StepProps) => (
    <View style={resumeStyles.formCard}>
      <PillSelector
        label="Resume Tone"
        options={TONES}
        selected={state.tone}
        required={isFieldRequired("tone")}
        onSelect={(v) => {
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
        onChangeText={(v) =>
          dispatch({ type: "UPDATE_FORM", data: { topAchievement: v } })
        }
        placeholder="e.g. Built an app with 10K users..."
        accessibilityLabel="Top career achievement"
      />
      <FieldInput
        label="Target Companies"
        icon="rocket-outline"
        value={state.targetCompanies}
        onChangeText={(v) =>
          dispatch({ type: "UPDATE_FORM", data: { targetCompanies: v } })
        }
        placeholder="e.g. Google, MNCs"
        accessibilityLabel="Target companies"
      />
      <FieldInput
        label="Special Instructions"
        icon="settings-outline"
        multiline
        value={state.specialInstructions}
        onChangeText={(v) =>
          dispatch({ type: "UPDATE_FORM", data: { specialInstructions: v } })
        }
        placeholder="e.g. Keep it to 1 page..."
        accessibilityLabel="Special instructions for resume generation"
      />
    </View>
  ),
);

// ─── Nav buttons ─────────────────────────────────────────────────────────────
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
  }) => (
    <View style={resumeStyles.navButtons}>
      <TouchableOpacity
        style={resumeStyles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back to previous step"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        disabled={isBuilding}
      >
        <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
        <Text style={resumeStyles.backButtonText}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          resumeStyles.nextButton,
          (!canProceed || isBuilding) && resumeStyles.nextButtonDisabled,
        ]}
        onPress={onNext}
        disabled={isBuilding}
        accessibilityRole="button"
        accessibilityLabel={isLastStep ? "Build resume" : "Go to next step"}
        accessibilityState={{ disabled: !canProceed || isBuilding }}
      >
        {isBuilding && isLastStep ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={resumeStyles.nextButtonText}>
              {isLastStep ? "✨ Build Resume" : "Next"}
            </Text>
            {!isLastStep && (
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            )}
          </>
        )}
      </TouchableOpacity>
    </View>
  ),
);

// ─── Restore modal with entrance animation ────────────────────────────────────
const RestoreModal = React.memo(
  ({
    onResume,
    onStartFresh,
  }: {
    onResume: () => void;
    onStartFresh: () => void;
  }) => {
    const scale = useSharedValue(0.88);
    const opacity = useSharedValue(0);

    useEffect(() => {
      scale.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.back(1.4)),
      });
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
                backgroundColor: colors.surface,
                borderRadius: 20,
                paddingVertical: 28,
                paddingHorizontal: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              },
              cardStyle,
            ]}
          >
            {/* Icon */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.accent + "18",
                borderWidth: 1,
                borderColor: colors.accent + "30",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="time-outline" size={32} color={colors.accent} />
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.textPrimary,
                textAlign: "center",
                marginBottom: 8,
                letterSpacing: -0.3,
              }}
            >
              Resume your work?
            </Text>

            {/* Description */}
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 24,
                paddingHorizontal: 8,
              }}
            >
              You have a saved draft from your previous session.
            </Text>

            {/* Primary CTA */}
            <TouchableOpacity
              style={{
                width: "100%",
                height: 50,
                backgroundColor: colors.primary,
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
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#FFFFFF",
                }}
              >
                Resume Draft
              </Text>
            </TouchableOpacity>

            {/* Secondary CTA */}
            <TouchableOpacity
              style={{
                width: "100%",
                height: 50,
                backgroundColor: "transparent",
                borderRadius: 13,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={onStartFresh}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Start new resume"
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "500",
                  color: colors.textSecondary,
                }}
              >
                Start Fresh
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  },
);

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ResumeBuilderScreen() {
  const insets = useSafeAreaInsets();
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;
  const navigation = useNavigation();
  const engine = useResumeEngine();
  const { state, dispatch } = engine;
  const toast = useToast();

  // ── Draft restore state ──────────────────────────────────────────
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const hasCheckedDraft = useRef(false);
  const hasUserInteracted = useRef(false);

  // Mark interaction on any meaningful form change — cancels pending modal
  useEffect(() => {
    if (
      state.formData.fullName ||
      state.formData.email ||
      state.formData.targetRole
    ) {
      hasUserInteracted.current = true;
    }
  }, [state.formData]);

  // Check draft ONCE on mount using peekDraft (no state mutation).
  // Only show modal if draft has meaningful content AND user hasn't typed anything.
  useEffect(() => {
    if (hasCheckedDraft.current) return;
    hasCheckedDraft.current = true;

    let cancelled = false;

    (async () => {
      try {
        // Early exit if user already interacted before async started
        if (hasUserInteracted.current) return;

        const hasMeaningfulDraft = await engine.peekDraft();

        if (cancelled) return;

        if (hasMeaningfulDraft && !hasUserInteracted.current) {
          setShowRestoreModal(true);
          console.log(
            "[ResumeBuilder] Showing restore modal — valid draft found",
          );
        } else {
          console.log(
            "[ResumeBuilder] No modal — draft empty or user already interacted",
          );
        }
      } catch (err) {
        console.warn("[ResumeBuilder] Draft check failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume Draft: NOW apply the draft to state, then close modal
  const handleResumeDraft = useCallback(async () => {
    setShowRestoreModal(false);
    await engine.applyDraft();
  }, [engine]);

  // Start Fresh: clear storage + reset state, close modal
  const handleStartFresh = useCallback(() => {
    engine.clearDraft();
    setShowRestoreModal(false);
    setShowErrors(false);
  }, [engine]);

  // ── Per-step inline validation ───────────────────────────────────
  const [showErrors, setShowErrors] = useState(false);
  // Real-time errors: only active fields that have been touched get live feedback
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const currentErrors = useMemo(
    () => validateStep(state.currentStep, state.formData),
    [state.currentStep, state.formData],
  );

  // Errors to display: show all if showErrors, else only touched fields
  const visibleErrors = useMemo(() => {
    if (showErrors) return currentErrors;
    const filtered: Record<string, string> = {};
    for (const key of touchedFields) {
      if (currentErrors[key]) filtered[key] = currentErrors[key];
    }
    return filtered;
  }, [showErrors, currentErrors, touchedFields]);

  // Mark a field as touched when user changes it (enables real-time feedback)
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

  // ── Loading animation ────────────────────────────────────────────
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
          withTiming(1.2, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1.0, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
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

  // ── Hardware back ────────────────────────────────────────────────
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
    }, [state.phase, state.currentStep, state.asyncStatus, engine, dispatch]),
  );

  // ── Next handler ─────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (!engine.canProceed()) {
      // Show all errors for this step on tap
      setShowErrors(true);
    } else {
      setShowErrors(false);
      engine.handleNext();
    }
  }, [engine]);

  // ── Error state ──────────────────────────────────────────────────
  if (state.asyncStatus === "error" && state.error) {
    return (
      <View style={resumeStyles.loadingContainer}>
        <Ionicons
          name={
            state.error.type === "network"
              ? "cloud-offline-outline"
              : "alert-circle-outline"
          }
          size={64}
          color={colors.error}
        />
        <Text style={resumeStyles.loadingTitle}>
          {state.error.type === "validation"
            ? "Check your inputs"
            : "Something went wrong"}
        </Text>
        <Text
          style={[
            resumeStyles.loadingSubtitle,
            { color: colors.textSecondary },
          ]}
        >
          {state.error.message}
        </Text>
        <View style={[resumeStyles.buttonRow, { marginTop: 24 }]}>
          {state.error.retryAction && (
            <TouchableOpacity
              style={[resumeStyles.primaryButton, { marginRight: 8 }]}
              onPress={() => {
                if (state.error?.retryAction === "generate")
                  engine.buildResume();
                if (state.error?.retryAction === "export")
                  engine.exportAndShare(() =>
                    toast("PDF ready to share ✓", "success"),
                  );
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

  // ── Loading phase ────────────────────────────────────────────────
  if (state.phase === "loading" && state.asyncStatus === "loading") {
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

  // ── Preview phase ────────────────────────────────────────────────
  if (state.phase === "preview" && state.generatedResume) {
    return (
      <ResumePreview
        formData={state.formData}
        generatedResume={state.generatedResume}
        isHistoryView={!!state.selectedResume}
        processing={
          state.phase === "preview" && state.asyncStatus === "loading"
        }
        onAction={() =>
          engine.exportAndShare(() => toast("PDF ready to share ✓", "success"))
        }
        onReset={() => dispatch({ type: "RESET_BUILDER" })}
        onBackToHistory={() => {
          dispatch({ type: "SET_PHASE", phase: "input" });
          dispatch({ type: "SET_TAB", tab: "history" });
        }}
      />
    );
  }

  // ── Input phase ──────────────────────────────────────────────────
  return (
    <View style={resumeStyles.container}>
      {/* Restore modal */}
      {showRestoreModal && (
        <RestoreModal
          onResume={handleResumeDraft}
          onStartFresh={handleStartFresh}
        />
      )}

      {/* Header */}
      <View style={resumeStyles.header}>
        <TouchableOpacity
          style={{ position: "absolute", left: 16, zIndex: 10, padding: 4 }}
          onPress={() => engine.handleBack(() => navigation.goBack())}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={resumeStyles.headerTitle}>Resume Builder</Text>
      </View>

      {state.inputTab === "history" ? (
        <View
          style={[
            resumeStyles.scrollContent,
            { paddingBottom: bottomInset + 20 },
          ]}
        >
          <StepIndicator
            currentStep={state.currentStep}
            totalSteps={TOTAL_STEPS}
            stepTitle="Resume History"
          />
          <ResumeHistoryList
            history={state.resumeHistory}
            loading={
              state.asyncStatus === "loading" &&
              state.resumeHistory.length === 0
            }
            onSelect={(item) => dispatch({ type: "LOAD_HISTORY_ITEM", item })}
            onDelete={(id) => engine.deleteResumeHistory(id)}
            onBuildNew={() => dispatch({ type: "SET_TAB", tab: "form" })}
            onLoadMore={engine.loadMoreHistory}
          />
        </View>
      ) : (
        <>
          <KeyboardAwareScrollView
            style={resumeStyles.scrollContent}
            contentContainerStyle={[
              resumeStyles.scrollContentContainer,
              { paddingBottom: 20 },
            ]}
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={24}
            keyboardShouldPersistTaps="handled"
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

            {state.currentStep === 1 && (
              <Step1
                state={state.formData}
                dispatch={dispatch}
                errors={visibleErrors}
                markTouched={markTouched}
              />
            )}
            {state.currentStep === 2 && (
              <Step2
                state={state.formData}
                dispatch={dispatch}
                errors={visibleErrors}
                markTouched={markTouched}
              />
            )}
            {state.currentStep === 3 && (
              <Step3
                state={state.formData}
                dispatch={dispatch}
                errors={visibleErrors}
                markTouched={markTouched}
              />
            )}
            {state.currentStep === 4 && (
              <Step4
                state={state.formData}
                dispatch={dispatch}
                errors={visibleErrors}
                markTouched={markTouched}
              />
            )}
            {state.currentStep === 5 && (
              <Step5
                state={state.formData}
                dispatch={dispatch}
                errors={visibleErrors}
                markTouched={markTouched}
              />
            )}
          </KeyboardAwareScrollView>

          {/* Fixed footer — always visible, never scrolls */}
          <View
            style={[
              resumeStyles.fixedFooter,
              { paddingBottom: bottomInset + 12 },
            ]}
          >
            <NavButtons
              onBack={() => engine.handleBack(() => navigation.goBack())}
              onNext={handleNext}
              canProceed={engine.canProceed()}
              isLastStep={state.currentStep === TOTAL_STEPS}
              isBuilding={
                state.currentStep === TOTAL_STEPS &&
                state.asyncStatus === "loading"
              }
            />
          </View>
        </>
      )}
    </View>
  );
}
