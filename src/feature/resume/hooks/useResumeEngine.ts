import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { generateGeminiText, parseGeminiJson } from "../../../services/gemini";
import { supabase } from "../../../services/supabase";
import { handleGeminiError } from "../../../utils/gemini";
import { INITIAL_RESUME_STATE, resumeEngineReducer } from "../core/resumeReducer";
import type { GeneratedResume, InputTab, ResumeEngineState, ResumePhase, WorkExperience } from "../types/resume.types";
import { generateResumeHTML } from "../utils/resumeHTML";
import { buildResumePrompt } from "../utils/resumePrompt";

export function useResumeEngine() {
  const [state, dispatch] = useReducer(resumeEngineReducer, INITIAL_RESUME_STATE);

  // Sync state refs to break closure staleness during async timeouts
  const stateRef = useRef<ResumeEngineState>(state);
  const isGeneratingRef = useRef(false);
  const isExportingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
    const { data: userData } = await supabase.auth.getUser();
    return userData?.user?.id || null;
  };

  const checkCanProceed = useCallback((): boolean => {
    const { currentStep, formData } = stateRef.current;
    switch (currentStep) {
      case 1:
        return !!(formData.fullName.trim() && formData.email.trim());
      case 2:
        return !!(
          formData.targetRole.trim() &&
          formData.experienceLevel &&
          formData.industry &&
          formData.skills.trim()
        );
      case 3:
        return !!(
          formData.experiences[0]?.jobTitle.trim() || formData.experienceLevel === "Fresher"
        );
      case 4:
        return !!(formData.degree.trim() && formData.institution.trim() && formData.graduationYear.trim());
      case 5:
        return !!formData.tone;
      default:
        return false;
    }
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
    
    isGeneratingRef.current = true;
    dispatch({ type: "START_ASYNC" });
    
    try {
      const formData = stateRef.current.formData;
      const prompt = buildResumePrompt(formData);
      const raw = await generateGeminiText(prompt);
      const parsed = parseGeminiJson<GeneratedResume>(raw);
      
      if (!parsed) throw new Error("Invalid response");
      
      dispatch({ type: "GENERATE_SUCCESS", generatedResume: parsed });
    } catch (err) {
      handleGeminiError(err, () => buildResume());
      dispatch({ type: "SET_ERROR", error: "Could not build resume. Please try again." });
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

      // Saving to Supabase history
      try {
        const userId = await getUserId();
        if (userId) {
          let resumeId = currentState.selectedResume?.id;

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
                professional_summary: currentState.generatedResume.professionalSummary || null,
                core_skills: currentState.generatedResume.coreSkills || [],
                enhanced_experiences: currentState.generatedResume.enhancedExperiences || null,
                ats_keywords: currentState.generatedResume.atsKeywords || [],
                pdf_uri: uri
              })
              .select("id")
              .single();

            if (!resumeError && resumeRow) {
              resumeId = resumeRow.id;
            }
          } else {
             await supabase
              .from("resume_builds")
              .update({
                pdf_uri: uri
              })
              .eq("id", resumeId);
          }
        }
      } catch (err) {
        console.warn("Failed to natively save to history", err);
      }

      dispatch({ type: "EXPORT_SUCCESS", pdfUri: uri });
    } catch {
      dispatch({ type: "SET_ERROR", error: "Could not export PDF." });
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
      const userId = await getUserId();
      if (!userId) {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
        return;
      }

      const { data, error } = await supabase
        .from("resume_builds") // Note: The previous logic used resume_builds? 
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: data });
      } else {
        dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
      }
    } catch {
      dispatch({ type: "HISTORY_FETCH_SUCCESS", history: [] });
    }
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
    deleteResumeHistory,
    canProceed: checkCanProceed,
  };
}
