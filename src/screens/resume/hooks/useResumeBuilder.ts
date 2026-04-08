import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useProfile } from "../../../hooks";
import { generateGeminiText } from "../../../services/gemini";
import { supabase } from "../../../services/supabase";
import { parseGeminiJson } from "../../../utils/gemini";
import { EMPTY_EXPERIENCE, TOTAL_STEPS } from "../constants/resume.constants";
import type {
  GeneratedResume,
  InputTab,
  ResumeFormData,
  ResumeHistoryItem,
  ResumePhase,
  WorkExperience,
} from "../types/resume.types";
import { generateResumeHTML } from "../utils/resumeHTML";
import { buildResumePrompt } from "../utils/resumePrompt";

export function useResumeBuilder() {
  // ── Phase & UI state ───────────────────────────────────
  const [phase, setPhase] = useState<ResumePhase>("input");
  const [currentStep, setCurrentStep] = useState(1);
  const [inputTab, setInputTab] = useState<InputTab>("form");
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [generatedResume, setGeneratedResume] =
    useState<GeneratedResume | null>(null);

  // ── Form state — Step 1 ────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [city, setCity] = useState("");

  // ── Form state — Step 2 ────────────────────────────────
  const [targetRole, setTargetRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [industry, setIndustry] = useState("");
  const [skills, setSkills] = useState("");

  // ── Form state — Step 3 ────────────────────────────────
  const [experiences, setExperiences] = useState<WorkExperience[]>([
    { ...EMPTY_EXPERIENCE },
  ]);

  // ── Form state — Step 4 ────────────────────────────────
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [grade, setGrade] = useState("");
  const [certifications, setCertifications] = useState("");
  const [languages, setLanguages] = useState("");

  // ── Form state — Step 5 ────────────────────────────────
  const [tone, setTone] = useState("");
  const [topAchievement, setTopAchievement] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // ── History state ──────────────────────────────────────
  const [resumeHistory, setResumeHistory] = useState<ResumeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedResume, setSelectedResume] =
    useState<ResumeHistoryItem | null>(null);

  const { user } = useProfile();

  // ── Helpers ────────────────────────────────────────────
  const getUserId = async (): Promise<string | undefined> => {
    const { data: sessionData } = await supabase.auth.getSession();
    let uid = sessionData?.session?.user?.id;
    if (!uid) {
      const { data: userData } = await supabase.auth.getUser();
      uid = userData?.user?.id;
    }
    if (!uid && user?.id) uid = user.id;
    return uid;
  };

  const getFormData = (): ResumeFormData => ({
    fullName,
    email,
    phone,
    linkedin,
    city,
    targetRole,
    experienceLevel,
    industry,
    skills,
    experiences,
    degree,
    institution,
    graduationYear,
    grade,
    certifications,
    languages,
    tone,
    topAchievement,
    targetCompanies,
    specialInstructions,
  });

  // ── Validation ────────────────────────────────────────
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(fullName.trim() && email.trim());
      case 2:
        return !!(
          targetRole.trim() &&
          experienceLevel &&
          industry &&
          skills.trim()
        );
      case 3:
        return !!(
          experiences[0]?.jobTitle.trim() || experienceLevel === "Fresher"
        );
      case 4:
        return !!(degree.trim() && institution.trim() && graduationYear.trim());
      case 5:
        return !!tone;
      default:
        return false;
    }
  };

  // ── Navigation ────────────────────────────────────────
  const handleNext = () => {
    if (!canProceed()) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    } else {
      buildResume();
    }
  };

  const handleBack = (navigationGoBack: () => void) => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    } else {
      navigationGoBack();
    }
  };

  // ── Experience helpers ────────────────────────────────
  const addExperience = () => {
    if (experiences.length >= 4) return;
    setExperiences((prev) => [...prev, { ...EMPTY_EXPERIENCE }]);
  };

  const removeExperience = (index: number) => {
    setExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExperience = (
    index: number,
    field: keyof WorkExperience,
    value: string,
  ) => {
    setExperiences((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp)),
    );
  };

  // ── Reset ────────────────────────────────────────────
  const resetAll = () => {
    setPhase("input");
    setCurrentStep(1);
    setInputTab("form");
    setFullName("");
    setEmail("");
    setPhone("");
    setLinkedin("");
    setCity("");
    setTargetRole("");
    setExperienceLevel("");
    setIndustry("");
    setSkills("");
    setExperiences([{ ...EMPTY_EXPERIENCE }]);
    setDegree("");
    setInstitution("");
    setGraduationYear("");
    setGrade("");
    setCertifications("");
    setLanguages("");
    setTone("");
    setTopAchievement("");
    setTargetCompanies("");
    setSpecialInstructions("");
    setGeneratedResume(null);
    setPdfUri(null);
    setSelectedResume(null);
    setError(null);
  };

  // ── Gemini ───────────────────────────────────────────
  const buildResume = async () => {
    setPhase("loading");
    setError(null);
    try {
      const formData = getFormData();
      const prompt = buildResumePrompt(formData);
      const raw = await generateGeminiText(prompt);
      const parsed = parseGeminiJson<GeneratedResume>(raw);
      if (!parsed) throw new Error("Invalid response");
      setGeneratedResume(parsed);
      setPhase("preview");
    } catch {
      setError("Could not build resume. Please try again.");
      setPhase("input");
    }
  };

  // ── PDF Export ───────────────────────────────────────
  const exportPDF = async () => {
    if (!generatedResume) return;
    setExporting(true);
    try {
      const formData = getFormData();
      const html = generateResumeHTML(formData, generatedResume);
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      await saveResumeToHistory(uri);
      setPdfUri(uri);
      setPhase("exported");
    } catch {
      setError("Could not export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const shareResume = async () => {
    if (!pdfUri) return;
    try {
      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Resume",
      });
    } catch {}
  };

  // ── Supabase ─────────────────────────────────────────
  const saveResumeToHistory = async (uri: string) => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const formData = getFormData();

      // Check if a resumes row already exists for this builder session
      let resumeId = selectedResume?.id;

      if (!resumeId) {
        // Create parent resumes row first
        const { data: resumeRow, error: resumeError } = await supabase
          .from("resumes")
          .insert({
            user_id: userId,
            title: formData.fullName || "My Resume",
            file_url: null, // builder resumes have no file
            file_name: null,
            raw_text: null,
            is_primary: false,
          })
          .select()
          .single();

        if (resumeError) throw resumeError;
        resumeId = resumeRow.id;

        // Persist resumeId in builder state so re-saves update rather than duplicate
        setSelectedResume({
          id: resumeId,
          user_id: userId,
          full_name: formData.fullName,
          target_role: formData.targetRole,
          experience_level: formData.experienceLevel || null,
          industry: formData.industry || null,
          tone: formData.tone || null,
          skills: formData.skills || null,
          professional_summary: generatedResume?.professionalSummary || null,
          core_skills: generatedResume?.coreSkills || null,
          enhanced_experiences: generatedResume?.enhancedExperiences || null,
          ats_keywords: generatedResume?.atsKeywords || null,
          pdf_uri: uri,
          created_at: new Date().toISOString(),
        });
      }

      // Insert or update resume sections
      await supabase.from("resume_sections").insert({
        resume_id: resumeId,
        section_type: "builder_data",
        title: "Resume Content",
        content: JSON.stringify({
          formData,
          generatedResume,
          pdfUri: uri,
        }),
        display_order: 1,
      });
    } catch {}
  };

  const fetchResumeHistory = async () => {
    setHistoryLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        setResumeHistory([]);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("resume_builds")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!fetchError) setResumeHistory(data ?? []);
      else setResumeHistory([]);
    } catch {
      setResumeHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteResumeHistory = async (id: string) => {
    Alert.alert("Delete Resume", "Remove this resume from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.from("resume_builds").delete().eq("id", id);
            setResumeHistory((prev) => prev.filter((r) => r.id !== id));
          } catch {}
        },
      },
    ]);
  };

  const viewFromHistory = (item: ResumeHistoryItem) => {
    setSelectedResume(item);
    setGeneratedResume({
      professionalSummary: item.professional_summary ?? "",
      enhancedExperiences: item.enhanced_experiences ?? [],
      coreSkills: item.core_skills ?? [],
      atsKeywords: item.ats_keywords ?? [],
    });
    setFullName(item.full_name);
    setTargetRole(item.target_role);
    setPhase("preview");
  };

  // ── Effects ──────────────────────────────────────────
  useEffect(() => {
    if (inputTab !== "history") return;
    fetchResumeHistory();
  }, [inputTab]);

  // ── Return everything screen needs ───────────────
  return {
    // Phase
    phase,
    setPhase,
    currentStep,
    inputTab,
    setInputTab,
    loadingMessage,
    setLoadingMessage,
    error,
    setError,
    exporting,
    pdfUri,
    generatedResume,
    selectedResume,
    setSelectedResume,

    // Form — Step 1
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    linkedin,
    setLinkedin,
    city,
    setCity,

    // Form — Step 2
    targetRole,
    setTargetRole,
    experienceLevel,
    setExperienceLevel,
    industry,
    setIndustry,
    skills,
    setSkills,

    // Form — Step 3
    experiences,
    addExperience,
    removeExperience,
    updateExperience,

    // Form — Step 4
    degree,
    setDegree,
    institution,
    setInstitution,
    graduationYear,
    setGraduationYear,
    grade,
    setGrade,
    certifications,
    setCertifications,
    languages,
    setLanguages,

    // Form — Step 5
    tone,
    setTone,
    topAchievement,
    setTopAchievement,
    targetCompanies,
    setTargetCompanies,
    specialInstructions,
    setSpecialInstructions,

    // History
    resumeHistory,
    historyLoading,

    // Actions
    canProceed,
    handleNext,
    handleBack,
    buildResume,
    exportPDF,
    shareResume,
    deleteResumeHistory,
    viewFromHistory,
    resetAll,
    getFormData,
  };
}
