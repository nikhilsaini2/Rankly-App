import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { generateGeminiTextWithRetry, parseGeminiJson } from "../../../services/gemini";
import { supabase } from "../../../services/supabase";
import { handleGeminiError } from "../../../utils/gemini";
import { INITIAL_RESUME_STATE, resumeEngineReducer } from "../core/resumeReducer";
import type { GeneratedResume, ResumeEngineState } from "../types/resume.types";
import { generateResumeHTML } from "../utils/resumeHTML";
import { buildResumePrompt } from "../utils/resumePrompt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { withResilience } from "../../../utils/resilience";
import { GeminiResumeSchema, validateFullForm, validateStep } from "../utils/validation";
import { sanitizeGeneratedResume } from "../utils/resumeSanitizer";

const DRAFT_STORAGE_KEY = "@resume_builder_draft_v1";
const DRAFT_VERSION = 2;

// ─── Draft shape validation ───────────────────────────────────────────────────
// Checks structural integrity — version, required fields, correct types.
function isDraftStructurallyValid(parsed: any): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  if (parsed.version !== DRAFT_VERSION) return false;
  if (typeof parsed.lastSaved !== "number") return false;
  if (!parsed.formData || typeof parsed.formData !== "object") return false;
  const fd = parsed.formData;
  if (typeof fd.fullName !== "string") return false;
  if (typeof fd.email !== "string") return false;
  if (!Array.isArray(fd.experiences)) return false;
  return true;
}

// ─── Draft content validation ─────────────────────────────────────────────────
// A draft is only worth offering to restore if it has at least ONE meaningful field.
// Prevents the modal from showing for a blank/empty draft.
function isDraftMeaningful(parsed: any): boolean {
  const fd = parsed?.formData;
  if (!fd) return false;
  return Boolean(
    fd.fullName?.trim() ||
    fd.email?.trim() ||
    fd.targetRole?.trim() ||
    fd.skills?.trim() ||
    fd.experiences?.some((exp: any) =>
      exp.jobTitle?.trim() || exp.company?.trim()
    )
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
        await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
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

  // ── peekDraft — read + validate without touching reducer state ───────────
  // Use this to decide whether to show the restore modal.
  // Does NOT dispatch anything — safe to call before user interaction.
  const peekDraft = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return false;

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        console.warn("[ResumeEngine] Discarded corrupted draft (invalid JSON)");
        return false;
      }

      if (!isDraftStructurallyValid(parsed)) {
        await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        console.warn("[ResumeEngine] Discarded invalid draft (failed shape check)");
        return false;
      }

      if (!isDraftMeaningful(parsed)) {
        // Draft exists but is empty — silently discard, no modal needed
        await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        console.log("[ResumeEngine] Draft discarded — no meaningful content");
        return false;
      }

      console.log("[ResumeEngine] Valid meaningful draft found, lastSaved:", new Date(parsed.lastSaved).toISOString());
      return true;
    } catch (err) {
      console.warn("[ResumeEngine] peekDraft failed", err);
      return false;
    }
  }, []);

  // ── applyDraft — load draft into reducer state ────────────────────────────
  // Only call this AFTER user confirms they want to restore.
  const applyDraft = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return false;

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        return false;
      }

      if (!isDraftStructurallyValid(parsed) || !isDraftMeaningful(parsed)) {
        await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        return false;
      }

      dispatch({ type: "RESTORE_SESSION", state: parsed });
      console.log("[ResumeEngine] Draft applied to state");
      return true;
    } catch (err) {
      console.warn("[ResumeEngine] applyDraft failed", err);
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

  const handleNext = useCallback(() => {
    if (!checkCanProceed()) return;
    if (stateRef.current.currentStep < 5) {
      dispatch({ type: "SET_STEP", step: stateRef.current.currentStep + 1 });
    } else {
      buildResume();
    }
  }, [checkCanProceed]);

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

  const exportPDF = useCallback(async () => {
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
    fetchResumeHistory,
    loadMoreHistory,
    deleteResumeHistory,
    clearDraft,
    restoreDraft,
    peekDraft,
    applyDraft,
    canProceed: checkCanProceed,
  };
}
