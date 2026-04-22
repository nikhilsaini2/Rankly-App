import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { generateGeminiTextWithRetry, parseGeminiJson } from "../../../services/gemini";
import { supabase } from "../../../services/supabase";
import { handleGeminiError } from "../../../utils/gemini";
import { INITIAL_RESUME_STATE, resumeEngineReducer } from "../core/resumeReducer";
import { EMPTY_EXPERIENCE } from "../constants/resume.constants";
import type { GeneratedResume, ResumeEngineState } from "../types/resume.types";
import { generateResumeHTML } from "../utils/resumeHTML";
import { buildResumePrompt } from "../utils/resumePrompt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { withResilience } from "../../../utils/resilience";
import { GeminiResumeSchema, validateFullForm, validateStep } from "../utils/validation";
import { sanitizeGeneratedResume } from "../utils/resumeSanitizer";
import { saveResume } from "../../../services/resume/resumeHistoryStorage";

const DRAFT_STORAGE_KEY = "@resume_builder_draft_v1";
const DRAFT_VERSION = 2;

// ─── Draft migration ──────────────────────────────────────────────────────────
// Handles version mismatches gracefully instead of discarding.
function migrateDraft(raw: any): { formData: any; currentStep: number; inputTab: string } | null {
  if (!raw || typeof raw !== "object") return null;

  const baseFormData = {
    fullName: "", email: "", phone: "", linkedin: "", city: "",
    targetRole: "", experienceLevel: "", industry: "", skills: "",
    experiences: [{ ...EMPTY_EXPERIENCE }],
    degree: "", institution: "", graduationYear: "", grade: "",
    certifications: "", languages: "", tone: "", topAchievement: "",
    targetCompanies: "", specialInstructions: "",
  };

  const rawFormData = raw.formData && typeof raw.formData === "object" ? raw.formData : {};

  const experiences =
    Array.isArray(rawFormData.experiences) && rawFormData.experiences.length > 0
      ? rawFormData.experiences
      : Array.isArray(raw.experiences) && raw.experiences.length > 0
        ? raw.experiences
        : [{ ...EMPTY_EXPERIENCE }];

  return {
    formData: { ...baseFormData, ...rawFormData, experiences },
    currentStep: typeof raw.currentStep === "number" ? raw.currentStep : 1,
    inputTab: raw.inputTab ?? "form",
  };
}

// ─── Draft content validation ─────────────────────────────────────────────────
function isDraftMeaningful(draft: { formData: any } | null): boolean {
  const fd = draft?.formData;
  if (!fd) return false;
  return Boolean(
    fd.fullName?.trim() ||
    fd.email?.trim() ||
    fd.targetRole?.trim() ||
    fd.skills?.trim() ||
    fd.experiences?.some((exp: any) => exp.jobTitle?.trim() || exp.company?.trim()),
  );
}

export function useResumeEngine() {
  const [state, dispatch] = useReducer(resumeEngineReducer, INITIAL_RESUME_STATE);

  const stateRef = useRef<ResumeEngineState>(state);
  const isGeneratingRef = useRef(false);
  const isExportingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Tracks when this session started — used for multi-session conflict detection
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Debounced draft persistence ───────────────────────────────────────────
  useEffect(() => {
    if (state.inputTab !== "form" || state.phase === "exported") return;

    const timeout = setTimeout(async () => {
      try {
        const draft = {
          formData: state.formData,
          currentStep: state.currentStep,
          phase: state.phase === "loading" ? "input" : state.phase,
          generatedResume: state.generatedResume,
          pdfUri: state.pdfUri,
          version: DRAFT_VERSION,
          lastSaved: Date.now(),
        };
        // Only persist if there's meaningful content — prevents saving empty initial state
        if (isDraftMeaningful(draft)) {
          await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        }
      } catch (err) {
        console.warn("[ResumeEngine] Failed to persist draft", err);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [state.formData, state.currentStep, state.phase, state.generatedResume, state.pdfUri, state.inputTab]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── Release locks when app backgrounds ───────────────────────────────────
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        if (stateRef.current.asyncStatus === "loading") {
          isGeneratingRef.current = false;
          isExportingRef.current = false;
        }
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, []);

  const getUserId = async (): Promise<string | null> => {
    const { data: userData } = await supabase.auth.getUser();
    return userData?.user?.id || null;
  };

  const peekDraft = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return false;
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { return false; }
      const draft = migrateDraft(parsed);
      return isDraftMeaningful(draft);
    } catch {
      return false;
    }
  }, []);

  const applyDraft = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return false;
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { return false; }
      const draft = migrateDraft(parsed);
      if (!draft || !isDraftMeaningful(draft)) return false;
      dispatch({
        type: "RESTORE_SESSION",
        state: {
          formData: draft.formData,
          currentStep: draft.currentStep,
          inputTab: draft.inputTab as any,
          phase: "input",
          asyncStatus: "idle",
          error: null,
        },
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── restoreDraft — kept for backward compat, now delegates to applyDraft ──
  const restoreDraft = applyDraft;

  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      dispatch({ type: "RESET_BUILDER" });
    } catch {}
  }, []);

  const checkCanProceed = useCallback((): boolean => {
    const { currentStep, formData } = stateRef.current;
    const errors = validateStep(currentStep, formData);
    return Object.keys(errors).length === 0;
  }, []);

  const canProceedReactive = useCallback((): boolean => {
    const { currentStep, formData } = state;
    const errors = validateStep(currentStep, formData);
    return Object.keys(errors).length === 0;
  }, [state]);

  const handleNext = useCallback(() => {
    if (!canProceedReactive()) return;
    if (stateRef.current.currentStep < 5) {
      dispatch({ type: "SET_STEP", step: stateRef.current.currentStep + 1 });
    } else {
      buildResume();
    }
  }, [canProceedReactive]);

  const handleBack = useCallback((navigationGoBack: () => void) => {
    if (stateRef.current.currentStep > 1) {
      dispatch({ type: "SET_STEP", step: stateRef.current.currentStep - 1 });
    } else {
      navigationGoBack();
    }
  }, []);

  const buildResume = useCallback(async () => {
    if (isGeneratingRef.current) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    isGeneratingRef.current = true;
    dispatch({ type: "START_ASYNC" });

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        dispatch({
          type: "SET_ERROR",
          error: { message: "No internet connection. Changes saved locally.", type: "network", retryAction: "generate" },
        });
        return;
      }

      const formData = stateRef.current.formData;

      const validationErrors = validateFullForm(formData);
      if (validationErrors.length > 0) {
        dispatch({
          type: "SET_ERROR",
          error: { message: validationErrors[0], type: "validation" },
        });
        return;
      }

      const prompt = buildResumePrompt(formData);
      const raw = await withResilience(
        async () => generateGeminiTextWithRetry(prompt, 1, 10000),
        { abortSignal: abortControllerRef.current.signal, retries: 2 },
      );

      const parsed = parseGeminiJson<GeneratedResume>(raw);
      if (!parsed || !(await GeminiResumeSchema.isValid(parsed))) {
        throw new Error("Received malformed response from AI.");
      }

      const sanitized = sanitizeGeneratedResume(parsed as GeneratedResume);

      // Save to local history immediately after generation — fail-open
      try {
        const formData = stateRef.current.formData;
        const html = generateResumeHTML(formData, sanitized);
        await saveResume({
          html,
          rawData: sanitized,
          role: formData.targetRole,
          fullName: formData.fullName,
          experienceLevel: formData.experienceLevel,
          source: "builder",
          formData,
        });
      } catch (err) {
        console.warn("[ResumeEngine] Failed to save resume to history", err);
        // Non-fatal — generation still completes normally
      }

      // Clear draft — resume was successfully generated, no need to restore
      try { await AsyncStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}

      dispatch({ type: "GENERATE_SUCCESS", generatedResume: sanitized });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      handleGeminiError(err, () => buildResume());
      dispatch({
        type: "SET_ERROR",
        error: { message: "Could not build resume. Please try again.", type: "server", retryAction: "generate" },
      });
      dispatch({ type: "SET_PHASE", phase: "input" });
    } finally {
      isGeneratingRef.current = false;
    }
  }, []);

  const exportPDF = useCallback(async (onSuccess?: () => void) => {
    const currentState = stateRef.current;
    if (!currentState.generatedResume || isExportingRef.current) return;

    isExportingRef.current = true;
    dispatch({ type: "START_ASYNC" });

    try {
      const formData = currentState.formData;
      const html = generateResumeHTML(formData, currentState.generatedResume);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      try {
        const userId = await getUserId();
        if (userId) {
          await withResilience(async () => {
            const resumeId = stateRef.current.selectedResume?.id;
            if (!resumeId) {
              const { error: resumeError } = await supabase
                .from("resume_builds")
                .insert({
                  user_id: userId,
                  full_name: formData.fullName,
                  target_role: formData.targetRole,
                  experience_level: formData.experienceLevel || null,
                  industry: formData.industry || null,
                  tone: formData.tone || null,
                  skills: formData.skills || null,
                  professional_summary: currentState.generatedResume!.professionalSummary || null,
                  core_skills: currentState.generatedResume!.coreSkills || [],
                  enhanced_experiences: currentState.generatedResume!.enhancedExperiences || null,
                  ats_keywords: currentState.generatedResume!.atsKeywords || [],
                  pdf_uri: uri,
                })
                .select("id")
                .single();
              if (resumeError) throw resumeError;
            } else {
              const { error: updateError } = await supabase
                .from("resume_builds")
                .update({ pdf_uri: uri })
                .eq("id", resumeId);
              if (updateError) throw updateError;
            }
          }, { retries: 2 });
        }
      } catch {
        // Fail-open: Supabase save failure does not block PDF access
      }

      dispatch({ type: "EXPORT_SUCCESS", pdfUri: uri });
      onSuccess?.();
    } catch {
      dispatch({
        type: "SET_ERROR",
        error: { message: "Could not export PDF.", type: "server", retryAction: "export" },
      });
    } finally {
      isExportingRef.current = false;
    }
  }, []);

  const shareResume = useCallback(async () => {
    const { pdfUri } = stateRef.current;
    if (!pdfUri) return;
    try {
      await Sharing.shareAsync(pdfUri, { mimeType: "application/pdf", dialogTitle: "Share Resume" });
    } catch {}
  }, []);

  // ── Single unified action: export (if needed) then share ─────────────────
  // Execution lock prevents double-taps. PDF is cached — no re-generation.
  const exportAndShare = useCallback(async (onSuccess?: () => void, onError?: (msg: string) => void) => {
    if (isExportingRef.current) return;

    const existingUri = stateRef.current.pdfUri;

    // PDF already exists — skip export, go straight to share
    if (existingUri) {
      try {
        await Sharing.shareAsync(existingUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Resume",
        });
      } catch {}
      return;
    }

    // No PDF yet — export first, then share
    const currentState = stateRef.current;
    if (!currentState.generatedResume) return;

    isExportingRef.current = true;
    dispatch({ type: "START_ASYNC" });

    try {
      const formData = currentState.formData;
      const html = generateResumeHTML(formData, currentState.generatedResume);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // Persist to Supabase — fail-open
      try {
        const userId = await getUserId();
        if (userId) {
          await withResilience(async () => {
            const resumeId = stateRef.current.selectedResume?.id;
            if (!resumeId) {
              await supabase.from("resume_builds").insert({
                user_id: userId,
                full_name: formData.fullName,
                target_role: formData.targetRole,
                experience_level: formData.experienceLevel || null,
                industry: formData.industry || null,
                tone: formData.tone || null,
                skills: formData.skills || null,
                professional_summary: currentState.generatedResume!.professionalSummary || null,
                core_skills: currentState.generatedResume!.coreSkills || [],
                enhanced_experiences: currentState.generatedResume!.enhancedExperiences || null,
                ats_keywords: currentState.generatedResume!.atsKeywords || [],
                pdf_uri: uri,
              });
            } else {
              await supabase
                .from("resume_builds")
                .update({ pdf_uri: uri })
                .eq("id", resumeId);
            }
          }, { retries: 2 });
        }
      } catch {
        // Non-fatal
      }

      dispatch({ type: "EXPORT_SUCCESS", pdfUri: uri });
      onSuccess?.();

      // Open share sheet after state update
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Resume",
      });
    } catch {
      if (onError) {
        onError("Could not export PDF. Please try again.");
        dispatch({ type: "ABORT_ASYNC" });
      } else {
        dispatch({
          type: "SET_ERROR",
          error: { message: "Could not export PDF.", type: "server", retryAction: "export" },
        });
      }
    } finally {
      isExportingRef.current = false;
    }
  }, []);

  const fetchResumeHistory = useCallback(async () => {
    if (stateRef.current.asyncStatus === "loading") return;
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
        return;
      }
      const userId = await getUserId();
      if (!userId) {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
        return;
      }
      const { data, error } = await supabase
        .from("resume_builds")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(0, 19);
      dispatch({ type: "HISTORY_FETCH_SUCCESS", history: (!error && data) ? data : [] });
    } catch {
      dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
    }
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (stateRef.current.asyncStatus === "loading" || stateRef.current.resumeHistory.length % 20 !== 0) return;
    try {
      const userId = await getUserId();
      if (!userId) return;
      const currentCount = stateRef.current.resumeHistory.length;
      const { data, error } = await supabase
        .from("resume_builds")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(currentCount, currentCount + 19);
      if (!error && data && data.length > 0) {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [...stateRef.current.resumeHistory, ...data] });
      }
    } catch {}
  }, []);

  const deleteResumeHistory = useCallback(async (id: string) => {
    Alert.alert("Delete Resume", "Remove this resume from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.from("resume_builds").delete().eq("id", id);
            dispatch({ type: "HISTORY_DELETE_SUCCESS", id });
          } catch {}
        },
      },
    ]);
  }, []);

  useEffect(() => {
    if (state.inputTab === "history") {
      fetchResumeHistory();
    }
  }, [state.inputTab, fetchResumeHistory]);

  return {
    state,
    dispatch,
    handleNext,
    handleBack,
    buildResume,
    exportPDF,
    shareResume,
    exportAndShare,
    fetchResumeHistory,
    loadMoreHistory,
    deleteResumeHistory,
    clearDraft,
    restoreDraft,
    peekDraft,
    applyDraft,
    canProceed: canProceedReactive,
  };
}
