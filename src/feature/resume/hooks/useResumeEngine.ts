import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { generateGeminiTextWithRetry, parseGeminiJson } from "../../../services/gemini";
import { supabase } from "../../../services/supabase";
import { handleGeminiError } from "../../../utils/gemini";
import { INITIAL_RESUME_STATE, resumeEngineReducer } from "../core/resumeReducer";
import type { GeneratedResume, InputTab, ResumeEngineState, ResumePhase, WorkExperience } from "../types/resume.types";
import { generateResumeHTML } from "../utils/resumeHTML";
import { buildResumePrompt } from "../utils/resumePrompt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { withResilience } from "../../../utils/resilience";
import { GeminiResumeSchema, validateFullForm, validateStep } from "../utils/validation";

const DRAFT_STORAGE_KEY = "@resume_builder_draft_v1";

export function useResumeEngine() {
  const [state, dispatch] = useReducer(resumeEngineReducer, INITIAL_RESUME_STATE);

  // Sync state refs to break closure staleness during async timeouts
  const stateRef = useRef<ResumeEngineState>(state);
  const isGeneratingRef = useRef(false);
  const isExportingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Handle Debounced Local Persistence
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
          version: 2, // Version for migrations
          lastSaved: Date.now(),
        };
        await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (err) {
        console.warn("Failed to persist draft data", err);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [state.formData, state.currentStep, state.phase, state.generatedResume, state.pdfUri, state.inputTab]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Cancel any generation if app backgrounds
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        if (stateRef.current.asyncStatus === "loading") {
           // We can gracefully unlock generating state if needed.
           // However true cancellation requires an abort controller on fetch. Let's just reset UI flags safely.
           isGeneratingRef.current = false;
           isExportingRef.current = false;
        }
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, []);

  const getUserId = async (): Promise<string | null> => {
    // Cache or fetch resiliently
    const { data: userData } = await supabase.auth.getUser();
    return userData?.user?.id || null;
  };

  const restoreDraft = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        dispatch({ type: "RESTORE_SESSION", state: parsed });
        return true;
      }
    } catch {}
    return false;
  }, []);

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

    if (stateRef.current.currentStep < 5) { // TOTAL STEPS = 5
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
    
    // Stop any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    isGeneratingRef.current = true;
    dispatch({ type: "START_ASYNC" });
    
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        dispatch({ 
          type: "SET_ERROR", 
          error: { message: "No internet connection. Changes saved locally.", type: 'network', retryAction: 'generate' } 
        });
        return;
      }

      const formData = stateRef.current.formData;
      
      // Validate all steps before sending to AI
      const validationErrors = validateFullForm(formData);
      if (validationErrors.length > 0) {
        dispatch({ 
          type: "SET_ERROR", 
          error: { 
            message: validationErrors[0], // show the first specific error
            type: 'validation',
          } 
        });
        return;
      }

      const prompt = buildResumePrompt(formData);

      // Step 3 & 4: Network Resilience & Async Cancellation
      const raw = await withResilience(
        async (signal) => generateGeminiTextWithRetry(prompt, 1, 10000), // Internal retry is 1 here as we use withResilience wrap
        { abortSignal: abortControllerRef.current.signal, retries: 2 }
      );

      const parsed = parseGeminiJson<GeneratedResume>(raw);
      
      // Step 9: Validate Gemini response structure
      if (!parsed || !(await GeminiResumeSchema.isValid(parsed))) {
        throw new Error("Received malformed response from AI.");
      }
      
      dispatch({ type: "GENERATE_SUCCESS", generatedResume: parsed as GeneratedResume });
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      handleGeminiError(err, () => buildResume());
      dispatch({ 
        type: "SET_ERROR", 
        error: { message: "Could not build resume. Please try again.", type: 'server', retryAction: 'generate' } 
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
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Saving to Supabase history with resilience
      try {
        const userId = await getUserId();
        if (userId) {
          await withResilience(async () => {
            let resumeId = stateRef.current.selectedResume?.id;

            if (!resumeId) {
              const { data: resumeRow, error: resumeError } = await supabase
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
                  pdf_uri: uri
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
      } catch (err) {
        // We don't block the user if only the history save fails but they have the PDF
      }

      dispatch({ type: "EXPORT_SUCCESS", pdfUri: uri });
    } catch {
      dispatch({ 
        type: "SET_ERROR", 
        error: { message: "Could not export PDF.", type: 'server', retryAction: 'export' } 
      });
    } finally {
      isExportingRef.current = false;
    }
  }, []);

  const shareResume = useCallback(async () => {
    const { pdfUri } = stateRef.current;
    if (!pdfUri) return;
    try {
      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Resume",
      });
    } catch {}
  }, []);

  const fetchResumeHistory = useCallback(async () => {
    // Only execute if not currently generating
    if (stateRef.current.asyncStatus === "loading") return;

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
         dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] }); // fallback
         return;
      }

      const userId = await getUserId();
      if (!userId) {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
        return;
      }

      // Initial page load
      const { data, error } = await supabase
        .from("resume_builds") 
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(0, 19); // 20 items

      if (!error && data) {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: data });
      } else {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
      }
    } catch {
      dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
    }
  }, []);

  const loadMoreHistory = useCallback(async () => {
    // Only fetch if available and not currently generating
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

  // Sync Input Tab swaps
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
    canProceed: checkCanProceed,
  };
}
