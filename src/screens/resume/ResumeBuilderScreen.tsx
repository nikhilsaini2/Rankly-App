import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { useProfile } from "../../hooks";
import { generateGeminiText } from "../../services/gemini";
import { supabase } from "../../services/supabase/supabase";
import { colors } from "../../theme/color";
import type { RootStackParamList } from "../../types/navigation.types";
import { parseGeminiJson } from "../../utils/gemini";

interface WorkExperience {
  jobTitle: string;
  company: string;
  duration: string;
  achievement1: string;
  achievement2: string;
}

interface ResumeFormData {
  // Step 1
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  city: string;
  // Step 2
  targetRole: string;
  experienceLevel: string;
  industry: string;
  skills: string;
  // Step 3
  experiences: WorkExperience[];
  // Step 4
  degree: string;
  institution: string;
  graduationYear: string;
  grade: string;
  certifications: string;
  languages: string;
  // Step 5
  tone: string;
  topAchievement: string;
  targetCompanies: string;
  specialInstructions: string;
}

interface GeneratedResume {
  professionalSummary: string;
  enhancedExperiences: Array<{
    jobTitle: string;
    company: string;
    duration: string;
    bulletPoints: string[];
  }>;
  coreSkills: string[];
  atsKeywords: string[];
}

export interface ResumeHistoryItem {
  id: string;
  user_id: string;
  full_name: string;
  target_role: string;
  experience_level: string | null;
  industry: string | null;
  tone: string | null;
  skills: string | null;
  professional_summary: string | null;
  core_skills: string[] | null;
  enhanced_experiences: any | null;
  ats_keywords: string[] | null;
  pdf_uri: string | null;
  created_at: string;
}

type Phase = "input" | "loading" | "preview" | "exported";

const loadingMessages = [
  "Analyzing your experience...",
  "Crafting your summary...",
  "Optimizing for ATS systems...",
  "Adding power words...",
  "Formatting for recruiters...",
];

const stepIcons: Array<keyof typeof Ionicons.glyphMap> = [
  "person-outline",
  "briefcase-outline",
  "layers-outline",
  "school-outline",
  "sparkles-outline",
];

const stepMainTitles = [
  "Let's start with you",
  "What role are you targeting?",
  "Your work experience",
  "Education & extras",
  "Final touches",
];

const stepSubtitles = [
  "Your basic contact information",
  "This shapes your entire resume",
  "Add your most recent roles",
  "Complete your profile",
  "How should your resume sound?",
];

export default function ResumeBuilderScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useProfile();
  const [phase, setPhase] = useState<Phase>("input");
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedResume, setGeneratedResume] =
    useState<GeneratedResume | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [city, setCity] = useState("");

  // Step 2
  const [targetRole, setTargetRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [industry, setIndustry] = useState("");
  const [skills, setSkills] = useState("");

  // Step 3
  const [experiences, setExperiences] = useState<WorkExperience[]>([
    {
      jobTitle: "",
      company: "",
      duration: "",
      achievement1: "",
      achievement2: "",
    },
  ]);

  // Step 4
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [grade, setGrade] = useState("");
  const [certifications, setCertifications] = useState("");
  const [languages, setLanguages] = useState("");

  // Step 5
  const [tone, setTone] = useState("");
  const [topAchievement, setTopAchievement] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(0);

  // History state
  const [inputTab, setInputTab] = useState<"form" | "history">("form");
  const [resumeHistory, setResumeHistory] = useState<ResumeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedResume, setSelectedResume] =
    useState<ResumeHistoryItem | null>(null);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    if (phase === "loading") {
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
        setLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
      }, 1500);

      return () => clearInterval(interval);
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [phase]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return fullName.trim() && email.trim();
      case 2:
        return (
          targetRole.trim() && experienceLevel && industry && skills.trim()
        );
      case 3:
        return experiences[0].jobTitle.trim() || experienceLevel === "Fresher";
      case 4:
        return degree.trim() && institution.trim() && graduationYear.trim();
      case 5:
        return tone !== "";
      default:
        return false;
    }
  };

  const buildResume = async () => {
    setPhase("loading");

    const formData: ResumeFormData = {
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
    };

    const prompt = `You are an expert resume writer and ATS optimization specialist.
Build a complete, professional resume for this candidate.

CANDIDATE PROFILE:
Name: ${formData.fullName}
Target Role: ${formData.targetRole}
Experience Level: ${formData.experienceLevel}
Industry: ${formData.industry}
Skills: ${formData.skills}
Location: ${formData.city || "Not specified"}
Tone: ${formData.tone}
Target Companies: ${formData.targetCompanies || "Not specified"}
Top Achievement: ${formData.topAchievement || "Not specified"}
Special Instructions: ${formData.specialInstructions || "None"}

WORK EXPERIENCE:
${formData.experiences
  .map(
    (exp, i) => `
Role ${i + 1}:
- Title: ${exp.jobTitle}
- Company: ${exp.company}
- Duration: ${exp.duration}
- Achievement 1: ${exp.achievement1}
- Achievement 2: ${exp.achievement2}
`,
  )
  .join("\n")}

EDUCATION:
- Degree: ${formData.degree}
- Institution: ${formData.institution}
- Year: ${formData.graduationYear}
- Grade: ${formData.grade || "Not specified"}

CERTIFICATIONS: ${formData.certifications || "None"}
LANGUAGES: ${formData.languages || "Not specified"}

Generate a ${formData.tone.toLowerCase()} resume optimized for ATS and 
${formData.targetRole} roles in the ${formData.industry} industry.

Return ONLY a JSON object, NO markdown, NO backticks, NO preamble:
{
  "professionalSummary": "<3-4 sentences, ${formData.tone.toLowerCase()} tone, keyword-rich, quantified where possible>",
  "enhancedExperiences": [
    {
      "jobTitle": "<exact title>",
      "company": "<exact company>",
      "duration": "<exact duration>",
      "bulletPoints": [
        "<strong action verb + achievement + quantified result>",
        "<strong action verb + achievement + quantified result>",
        "<strong action verb + achievement + quantified result>"
      ]
    }
  ],
  "coreSkills": ["<skill1>", "<skill2>", ... up to 12 skills extracted and enhanced from their input],
  "atsKeywords": ["<keyword1>", "<keyword2>", ... 8 ATS keywords for ${formData.targetRole}]
}`;

    try {
      setError(null);
      const raw = await generateGeminiText(prompt);
      const parsed = parseGeminiJson<GeneratedResume>(raw);
      if (!parsed) throw new Error("Invalid response");

      setGeneratedResume(parsed);
      setPhase("preview");
    } catch (err) {
      setError("Could not build resume. Please try again.");
      setPhase("input");
    }
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const html = generateResumeHTML(
        {
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
        },
        generatedResume!,
      );

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
    } catch {
      // Handle sharing errors silently
    }
  };

  const saveResumeToHistory = async (uri: string) => {
    try {
      // Get userId via 3-method fallback
      let userId: string | undefined;
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id;
      if (!userId) {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id;
      }
      if (!userId && user?.id) userId = user.id;
      if (!userId) return;

      await supabase.from("resume_builds").insert({
        user_id: userId,
        full_name: fullName,
        target_role: targetRole,
        experience_level: experienceLevel || null,
        industry: industry || null,
        tone: tone || null,
        skills: skills || null,
        professional_summary: generatedResume?.professionalSummary || null,
        core_skills: generatedResume?.coreSkills || [],
        enhanced_experiences: generatedResume?.enhancedExperiences || [],
        ats_keywords: generatedResume?.atsKeywords || [],
        pdf_uri: uri,
      });
    } catch {
      // Non-fatal
    }
  };

  const resetForm = () => {
    setPhase("input");
    setCurrentStep(1);
    setFullName("");
    setEmail("");
    setPhone("");
    setLinkedin("");
    setCity("");
    setTargetRole("");
    setExperienceLevel("");
    setIndustry("");
    setSkills("");
    setExperiences([
      {
        jobTitle: "",
        company: "",
        duration: "",
        achievement1: "",
        achievement2: "",
      },
    ]);
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
    setError(null);
    setSelectedResume(null);
    setInputTab("form");
  };

  const generateResumeHTML = (
    form: ResumeFormData,
    resume: GeneratedResume,
  ): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      font-size: 11pt;
      color: #1a1a1a;
      line-height: 1.5;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #6C63FF;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .name {
      font-size: 26pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.5px;
    }
    .role {
      font-size: 13pt;
      color: #6C63FF;
      margin-top: 4px;
      font-weight: 500;
    }
    .contact {
      font-size: 9.5pt;
      color: #555;
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #6C63FF;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .summary {
      font-size: 10.5pt;
      color: #333;
      line-height: 1.7;
    }
    .exp-entry {
      margin-bottom: 14px;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .exp-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .exp-duration {
      font-size: 9.5pt;
      color: #777;
    }
    .exp-company {
      font-size: 10pt;
      color: #555;
      font-style: italic;
      margin-bottom: 5px;
    }
    .bullet {
      font-size: 10pt;
      color: #333;
      padding-left: 16px;
      position: relative;
      margin-bottom: 3px;
    }
    .bullet::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #6C63FF;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill-pill {
      background: #f0eeff;
      color: #6C63FF;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 9.5pt;
      font-weight: 500;
      border: 1px solid #d4d0ff;
    }
    .edu-entry {
      display: flex;
      justify-content: space-between;
    }
    .edu-left { flex: 1; }
    .edu-degree {
      font-size: 11pt;
      font-weight: 600;
      color: #1a1a1a;
    }
    .edu-institution {
      font-size: 10pt;
      color: #555;
      font-style: italic;
      margin-bottom: 4px;
    }
    .edu-right {
      text-align: right;
      font-size: 10pt;
      color: #777;
    }
    .cert-item, .lang-item {
      font-size: 10pt;
      color: #333;
      padding-left: 16px;
      position: relative;
      margin-bottom: 3px;
    }
    .cert-item::before, .lang-item::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #6C63FF;
    }
    .keywords {
      font-size: 9pt;
      color: #888;
      margin-top: 8px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${form.fullName}</div>
    <div class="role">${form.targetRole}</div>
    <div class="contact">
      ${form.email ? `<span>${form.email}</span>` : ""}
      ${form.phone ? `<span>${form.phone}</span>` : ""}
      ${form.city ? `<span>${form.city}</span>` : ""}
      ${form.linkedin ? `<span>${form.linkedin}</span>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">${resume.professionalSummary}</div>
  </div>

  ${
    resume.enhancedExperiences.length > 0
      ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${resume.enhancedExperiences
      .map(
        (exp) => `
    <div class="exp-entry">
      <div class="exp-header">
        <div class="exp-title">${exp.jobTitle}</div>
        <div class="exp-duration">${exp.duration}</div>
      </div>
      <div class="exp-company">${exp.company}</div>
      ${exp.bulletPoints
        .map((bp) => `<div class="bullet">${bp}</div>`)
        .join("")}
    </div>`,
      )
      .join("")}
  </div>`
      : ""
  }

  <div class="section">
    <div class="section-title">Education</div>
    <div class="edu-entry">
      <div class="edu-left">
        <div class="edu-degree">${form.degree}</div>
        <div class="edu-institution">${form.institution}</div>
        ${form.grade ? `<div class="edu-institution">${form.grade}</div>` : ""}
      </div>
      <div class="edu-right">${form.graduationYear}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Core Skills</div>
    <div class="skills-grid">
      ${resume.coreSkills
        .map((skill) => `<span class="skill-pill">${skill}</span>`)
        .join("")}
    </div>
  </div>

  ${
    form.certifications
      ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${form.certifications
      .split(",")
      .map((cert) => `<div class="cert-item">${cert.trim()}</div>`)
      .join("")}
  </div>`
      : ""
  }

  ${
    form.languages
      ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="lang-item">${form.languages}</div>
  </div>`
      : ""
  }

  <div class="keywords">
    ATS Keywords: ${resume.atsKeywords.join(", ")}
  </div>
</body>
</html>
`;

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (phase === "preview" || phase === "exported") {
          setPhase("input");
          setSelectedResume(null);
          return true;
        }
        if (phase === "input" && currentStep > 1) {
          setCurrentStep((s) => s - 1);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBack,
      );
      return () => subscription.remove();
    }, [phase, currentStep]),
  );

  useEffect(() => {
    if (inputTab !== "history") return;

    const fetchResumeHistory = async () => {
      setHistoryLoading(true);
      try {
        let userId: string | undefined;
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData?.session?.user?.id;
        if (!userId) {
          const { data: userData } = await supabase.auth.getUser();
          userId = userData?.user?.id;
        }
        if (!userId && user?.id) userId = user.id;
        if (!userId) {
          setResumeHistory([]);
          return;
        }

        const { data, error } = await supabase
          .from("resume_builds")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error) setResumeHistory(data ?? []);
        else setResumeHistory([]);
      } catch {
        setResumeHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchResumeHistory();
  }, [inputTab]);

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

  // INPUT PHASE
  if (phase === "input") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={{ position: "absolute", marginLeft: 18 }}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resume Builder</Text>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(currentStep / 5) * 100}%` },
              ]}
            />
          </View>

          {/* Step Meta */}
          <View style={styles.stepMeta}>
            <Text style={styles.stepMetaText}>Step {currentStep} of 5</Text>
            <Text style={styles.stepMetaTitle}>
              {stepMainTitles[currentStep - 1]}
            </Text>
          </View>

          {/* Tab Bar - Only show on step 1 */}
          {currentStep === 1 && (
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, inputTab === "form" && styles.tabActive]}
                onPress={() => setInputTab("form")}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={15}
                  color={inputTab === "form" ? "#fff" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    inputTab === "form" && styles.tabTextActive,
                  ]}
                >
                  New Resume
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, inputTab === "history" && styles.tabActive]}
                onPress={() => setInputTab("history")}
              >
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={inputTab === "history" ? "#fff" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    inputTab === "history" && styles.tabTextActive,
                  ]}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* History UI - Show when inputTab is 'history' */}
          {inputTab === "history" &&
            (historyLoading ? (
              <View style={styles.historyLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.historyLoadingText}>
                  Loading resumes...
                </Text>
              </View>
            ) : resumeHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name="document-text-outline"
                    size={40}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No resumes yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your built resumes will appear here
                </Text>
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => setInputTab("form")}
                >
                  <Text style={styles.emptyActionText}>
                    Build Your First Resume
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={resumeHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.historyCard}
                    onPress={() => {
                      setSelectedResume(item);
                      // Show resume preview from history
                      // Map history item to generatedResume format and show preview phase
                      setGeneratedResume({
                        professionalSummary: item.professional_summary ?? "",
                        enhancedExperiences: item.enhanced_experiences ?? [],
                        coreSkills: item.core_skills ?? [],
                        atsKeywords: item.ats_keywords ?? [],
                      });
                      // Restore form data for display
                      setFullName(item.full_name);
                      setTargetRole(item.target_role);
                      setPhase("preview");
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.historyCardInner}>
                      {/* Left — Icon Circle */}
                      <View style={styles.historyCardIcon}>
                        <Ionicons
                          name="document-text"
                          size={22}
                          color={colors.accent}
                        />
                      </View>

                      {/* Center — Info */}
                      <View style={styles.historyCardInfo}>
                        <Text style={styles.historyCardName}>
                          {item.full_name}
                        </Text>
                        <Text style={styles.historyCardRole}>
                          {item.target_role}
                        </Text>
                        <View style={styles.historyCardMeta}>
                          {item.experience_level && (
                            <View style={styles.metaPill}>
                              <Text style={styles.metaPillText}>
                                {item.experience_level}
                              </Text>
                            </View>
                          )}
                          {item.industry && (
                            <View style={styles.metaPill}>
                              <Text style={styles.metaPillText}>
                                {item.industry}
                              </Text>
                            </View>
                          )}
                          {item.tone && (
                            <View
                              style={[styles.metaPill, styles.metaPillAccent]}
                            >
                              <Text
                                style={[
                                  styles.metaPillText,
                                  styles.metaPillAccentText,
                                ]}
                              >
                                {item.tone}
                              </Text>
                            </View>
                          )}
                        </View>
                        {item.core_skills && item.core_skills.length > 0 && (
                          <Text
                            style={styles.historyCardSkills}
                            numberOfLines={1}
                          >
                            {item.core_skills.slice(0, 4).join(" • ")}
                          </Text>
                        )}
                      </View>

                      {/* Right — Date + Delete */}
                      <View style={styles.historyCardRight}>
                        <Text style={styles.historyCardDate}>
                          {new Date(item.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </Text>
                        <TouchableOpacity
                          onPress={() => deleteResumeHistory(item.id)}
                          style={styles.historyDeleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color="#FF6B6B"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            ))}

          {/* Step Title Card */}
          {currentStep === 1 && inputTab === "form" && (
            <View style={styles.stepTitleCard}>
              <View style={styles.stepIconCircle}>
                <Ionicons
                  name={stepIcons[currentStep - 1]}
                  size={22}
                  color={colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>
                  {stepMainTitles[currentStep - 1]}
                </Text>
                <Text style={styles.stepSubtitle}>
                  {stepSubtitles[currentStep - 1]}
                </Text>
              </View>
            </View>
          )}

          {/* Step 1: Personal Info */}
          {currentStep === 1 && inputTab === "form" && (
            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Full Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. Nikhil Sharma"
                    placeholderTextColor={colors.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Email Address <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. nikhil@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. +91 98765 43210"
                    placeholderTextColor={colors.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>LinkedIn URL</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="logo-linkedin"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="linkedin.com/in/yourname"
                    placeholderTextColor={colors.textMuted}
                    value={linkedin}
                    onChangeText={setLinkedin}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>City / Location</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. San Francisco, CA"
                    placeholderTextColor={colors.textMuted}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Target Role */}
          {currentStep === 2 && (
            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Target Job Title <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. Senior Software Engineer, Product Manager"
                    placeholderTextColor={colors.textMuted}
                    value={targetRole}
                    onChangeText={setTargetRole}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Experience Level <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.pillGrid}>
                  {["Fresher", "1-2 yrs", "3-5 yrs", "6-10 yrs", "10+ yrs"].map(
                    (level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.pill,
                          experienceLevel === level && styles.pillSelected,
                        ]}
                        onPress={() => setExperienceLevel(level)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            experienceLevel === level &&
                              styles.pillTextSelected,
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Industry <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.pillGrid}>
                  {[
                    "Technology",
                    "Finance",
                    "Healthcare",
                    "Marketing",
                    "Design",
                    "Sales",
                    "Other",
                  ].map((ind) => (
                    <TouchableOpacity
                      key={ind}
                      style={[
                        styles.pill,
                        industry === ind && styles.pillSelected,
                      ]}
                      onPress={() => setIndustry(ind)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          industry === ind && styles.pillTextSelected,
                        ]}
                      >
                        {ind}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Key Skills <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapperMultiline}>
                  <Ionicons
                    name="code-slash-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputMultiline}
                    placeholder="e.g. React Native, Python, SQL, Project Management, Leadership, Data Analysis..."
                    placeholderTextColor={colors.textMuted}
                    value={skills}
                    onChangeText={setSkills}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
                <Text style={styles.fieldHint}>Separate with commas</Text>
              </View>
            </View>
          )}

          {/* Step 3: Work Experience */}
          {currentStep === 3 && (
            <View style={styles.formCard}>
              {experienceLevel === "Fresher" && (
                <View style={styles.infoNote}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.accent}
                  />
                  <Text style={styles.infoNoteText}>
                    💡 No experience? Add internships, college projects, or
                    part-time work
                  </Text>
                </View>
              )}

              {experiences.map((exp, index) => (
                <View key={index} style={styles.expCard}>
                  <View style={styles.expCardHeader}>
                    <View style={styles.expCardNumber}>
                      <Text style={styles.expCardNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.expCardTitle}>
                      {exp.jobTitle || `Role ${index + 1}`}
                    </Text>
                    {experiences.length > 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          if (experiences.length > 1) {
                            setExperiences(
                              experiences.filter((_, i) => i !== index),
                            );
                          }
                        }}
                        style={styles.expDeleteBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#FF6B6B"
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Job Title</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="briefcase-outline"
                        size={16}
                        color={colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="e.g. Senior Software Engineer"
                        placeholderTextColor={colors.textMuted}
                        value={exp.jobTitle}
                        onChangeText={(text) => {
                          const newExperiences = [...experiences];
                          newExperiences[index].jobTitle = text;
                          setExperiences(newExperiences);
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Company Name</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color={colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="e.g. Google, Microsoft"
                        placeholderTextColor={colors.textMuted}
                        value={exp.company}
                        onChangeText={(text) => {
                          const newExperiences = [...experiences];
                          newExperiences[index].company = text;
                          setExperiences(newExperiences);
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Duration</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="e.g. Jan 2022 – Mar 2024"
                        placeholderTextColor={colors.textMuted}
                        value={exp.duration}
                        onChangeText={(text) => {
                          const newExperiences = [...experiences];
                          newExperiences[index].duration = text;
                          setExperiences(newExperiences);
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Key Achievement 1</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="e.g. Led team of 5 engineers..."
                        placeholderTextColor={colors.textMuted}
                        value={exp.achievement1}
                        onChangeText={(text) => {
                          const newExperiences = [...experiences];
                          newExperiences[index].achievement1 = text;
                          setExperiences(newExperiences);
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Key Achievement 2</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="e.g. Increased revenue by 30%..."
                        placeholderTextColor={colors.textMuted}
                        value={exp.achievement2}
                        onChangeText={(text) => {
                          const newExperiences = [...experiences];
                          newExperiences[index].achievement2 = text;
                          setExperiences(newExperiences);
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}

              {experiences.length < 4 && (
                <TouchableOpacity
                  style={styles.addRoleBtn}
                  onPress={() => {
                    const newExperiences = [
                      ...experiences,
                      {
                        jobTitle: "",
                        company: "",
                        duration: "",
                        achievement1: "",
                        achievement2: "",
                      },
                    ];
                    setExperiences(newExperiences);
                  }}
                >
                  <View style={styles.addRoleBtnInner}>
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={colors.accent}
                    />
                    <Text style={styles.addRoleBtnText}>Add Another Role</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Step 4: Education & Skills */}
          {currentStep === 4 && (
            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Degree / Qualification <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="school-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. B.Tech Computer Science, MBA Finance"
                    placeholderTextColor={colors.textMuted}
                    value={degree}
                    onChangeText={setDegree}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Institution Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="library-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. IIT Delhi, Stanford University"
                    placeholderTextColor={colors.textMuted}
                    value={institution}
                    onChangeText={setInstitution}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Year of Completion <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. 2022"
                    placeholderTextColor={colors.textMuted}
                    value={graduationYear}
                    onChangeText={setGraduationYear}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Grade / GPA</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="ribbon-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. 8.5 CGPA / 3.8 GPA"
                    placeholderTextColor={colors.textMuted}
                    value={grade}
                    onChangeText={setGrade}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Certifications</Text>
                <View style={styles.inputWrapperMultiline}>
                  <Ionicons
                    name="medal-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputMultiline}
                    placeholder="e.g. AWS Certified, Google Analytics, PMP..."
                    placeholderTextColor={colors.textMuted}
                    value={certifications}
                    onChangeText={setCertifications}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Languages</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="language-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. English (Fluent), Hindi (Native)"
                    placeholderTextColor={colors.textMuted}
                    value={languages}
                    onChangeText={setLanguages}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 5: Summary & Tone */}
          {currentStep === 5 && (
            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Resume Tone <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.pillGrid}>
                  {["Professional", "Confident", "Creative", "Academic"].map(
                    (t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.pill, tone === t && styles.pillSelected]}
                        onPress={() => setTone(t)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            tone === t && styles.pillTextSelected,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Your Biggest Career Highlight
                </Text>
                <View style={styles.inputWrapperMultiline}>
                  <Ionicons
                    name="sparkles-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputMultiline}
                    placeholder="e.g. Built an app with 10K users, Won national hackathon, Promoted within 6 months..."
                    placeholderTextColor={colors.textMuted}
                    value={topAchievement}
                    onChangeText={setTopAchievement}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Target Companies</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="rocket-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. Google, early-stage startups, MNCs"
                    placeholderTextColor={colors.textMuted}
                    value={targetCompanies}
                    onChangeText={setTargetCompanies}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Special Instructions</Text>
                <View style={styles.inputWrapperMultiline}>
                  <Ionicons
                    name="settings-outline"
                    size={16}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputMultiline}
                    placeholder="e.g. Emphasize leadership, Keep it to 1 page..."
                    placeholderTextColor={colors.textMuted}
                    value={specialInstructions}
                    onChangeText={setSpecialInstructions}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Navigation Buttons */}
          {inputTab === "form" && (
            <View style={styles.navButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() =>
                  currentStep > 1
                    ? setCurrentStep(currentStep - 1)
                    : navigation.goBack()
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !canProceed() && styles.nextButtonDisabled,
                ]}
                onPress={() =>
                  currentStep === 5
                    ? buildResume()
                    : setCurrentStep(currentStep + 1)
                }
                disabled={!canProceed()}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === 5 ? "✨ Build Resume" : "Next"}
                </Text>
                {currentStep < 5 && (
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // LOADING PHASE
  if (phase === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrapper}>
            <Animated.View style={pulseStyle}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={colors.accent}
              />
            </Animated.View>
          </View>
          <Text style={styles.loadingTitle}>Building your resume...</Text>
          <Text style={styles.loadingSubtitle}>
            {loadingMessages[loadingMessage]}
          </Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.loadingDot,
                  loadingMessage % 3 === i && styles.loadingDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // PREVIEW PHASE
  if (phase === "preview" && generatedResume) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <Text style={styles.headerTitle}>Resume Preview</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {/* History View Banner */}
          {selectedResume && (
            <TouchableOpacity
              style={styles.historyViewBanner}
              onPress={() => {
                setSelectedResume(null);
                setPhase("input");
                setInputTab("history");
              }}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.historyViewBannerText}>Back to History</Text>
            </TouchableOpacity>
          )}

          {/* CARD 1 - HEADER SECTION */}
          <View style={styles.resultCard}>
            <Text
              style={[styles.resultTitle, { fontSize: 22, fontWeight: "800" }]}
            >
              {fullName || "Your Name"}
            </Text>
            <Text style={[styles.resultSubtitle, { color: colors.accent }]}>
              {targetRole}
            </Text>
            <Text
              style={[
                styles.resultMeta,
                { fontSize: 12, color: colors.textSecondary },
              ]}
            >
              {email ? `${email} • ` : ""} {phone ? `${phone} • ` : ""}{" "}
              {city || ""}
            </Text>
            {linkedin && (
              <Text
                style={[
                  styles.resultMeta,
                  { fontSize: 12, color: colors.textSecondary },
                ]}
              >
                {linkedin}
              </Text>
            )}
          </View>

          {/* CARD 2 - PROFESSIONAL SUMMARY */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>Professional Summary</Text>
            <Text style={styles.cardContent}>
              {generatedResume.professionalSummary}
            </Text>
          </View>

          {/* CARD 3 - WORK EXPERIENCE */}
          {generatedResume.enhancedExperiences.length > 0 && (
            <View style={styles.resultCard}>
              <Text style={styles.cardTitle}>Work Experience</Text>
              {generatedResume.enhancedExperiences.map((exp, index) => (
                <View key={index} style={{ marginBottom: 16 }}>
                  <Text style={[styles.resultSubtitle, { fontWeight: "700" }]}>
                    {exp.jobTitle}
                    <Text
                      style={[
                        styles.resultMeta,
                        { color: colors.textSecondary, fontStyle: "italic" },
                      ]}
                    >
                      {" "}
                      {exp.company}
                    </Text>
                    <Text
                      style={[
                        styles.resultMeta,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {" "}
                      {exp.duration}
                    </Text>
                  </Text>
                  {exp.bulletPoints.map((bp, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{bp}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* CARD 4 - EDUCATION */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>Education</Text>
            <View style={styles.eduEntry}>
              <View style={styles.eduLeft}>
                <Text style={[styles.eduDegree, { fontWeight: "600" }]}>
                  {degree}
                </Text>
                <Text style={styles.eduInstitution}>{institution}</Text>
                {grade && <Text style={styles.eduInstitution}>{grade}</Text>}
              </View>
              <Text style={styles.eduRight}>{graduationYear}</Text>
            </View>
          </View>

          {/* CARD 5 - SKILLS */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>Core Skills</Text>
            <View style={styles.skillRow}>
              {generatedResume.coreSkills.map((skill, index) => (
                <View
                  key={index}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: colors.accent + "20",
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: colors.accent }]}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* CARD 6 - CERTIFICATIONS */}
          {certifications && (
            <View style={styles.resultCard}>
              <Text style={styles.cardTitle}>Certifications</Text>
              {certifications.split(",").map((cert, index) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.bulletText}>{cert.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* CARD 7 - LANGUAGES */}
          {languages && (
            <View style={styles.resultCard}>
              <Text style={styles.cardTitle}>Languages</Text>
              <Text style={styles.cardContent}>{languages}</Text>
            </View>
          )}

          {/* Bottom buttons */}
          {selectedResume ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { height: 56 }]}
                onPress={exportPDF}
                disabled={exporting}
              >
                <Text style={styles.primaryButtonText}>
                  {exporting ? "Exporting..." : "📄 Re-export PDF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostButton}
                onPress={() => {
                  setSelectedResume(null);
                  setPhase("input");
                  setInputTab("history");
                }}
              >
                <Text style={styles.ghostButtonText}>Back to History</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { height: 56 }]}
                onPress={exportPDF}
                disabled={exporting}
              >
                <Text style={styles.primaryButtonText}>
                  {exporting ? "Exporting..." : "📄 Export as PDF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ghostButton} onPress={resetForm}>
                <Text style={styles.ghostButtonText}>✏️ Start Over</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // EXPORTED PHASE
  if (phase === "exported") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <Text style={styles.headerTitle}>Resume Ready</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.loadingContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#00D4AA" />
          <Text style={styles.loadingTitle}>Resume Ready!</Text>
          <Text style={styles.loadingSubtitle}>
            Your PDF has been saved and is ready to share
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { marginRight: 8 }]}
              onPress={shareResume}
            >
              <Text style={styles.primaryButtonText}>Share Resume</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ghostButton} onPress={resetForm}>
              <Text style={styles.ghostButtonText}>Build Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  loadingIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent + "12",
    borderWidth: 1,
    borderColor: colors.accent + "25",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  loadingSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  loadingDotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  progressBarContainer: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    marginBottom: 6,
    marginTop: 8,
  },
  progressBarFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  stepMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  stepMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepMetaTitle: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
  },
  stepTitleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
    marginBottom: 20,
  },
  stepIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent + "15",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.accent + "30",
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 20,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  required: {
    color: colors.accent,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    height: "100%",
  },
  inputWrapperMultiline: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    minHeight: 100,
  },
  inputMultiline: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  expCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
    marginBottom: 12,
  },
  expCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  expCardNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.accent + "40",
  },
  expCardNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  expCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  expDeleteBtn: {
    padding: 4,
  },
  addRoleBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent + "30",
    borderStyle: "dashed",
    marginBottom: 16,
    overflow: "hidden",
  },
  addRoleBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: colors.accent + "08",
  },
  addRoleBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
  navButtons: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
    paddingBottom: 32,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    padding: 20,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 20,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  resultMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 8,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  skillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  eduEntry: {
    flexDirection: "row",
    marginBottom: 12,
  },
  eduLeft: {
    flex: 1,
  },
  eduDegree: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  eduInstitution: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: 4,
  },
  eduRight: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoNoteText: {
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  cardContent: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    flex: 1,
    height: 56,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    flex: 1,
    height: 56,
  },
  ghostButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  // Tab styles
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },
  // History styles
  historyLoadingContainer: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  historyLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAction: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  historyCard: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  historyCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.surface,
    padding: 14,
  },
  historyCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent + "15",
    borderWidth: 1,
    borderColor: colors.accent + "25",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  historyCardInfo: {
    flex: 1,
    gap: 4,
  },
  historyCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  historyCardRole: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "500",
  },
  historyCardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  metaPill: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metaPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  metaPillAccent: {
    backgroundColor: colors.accent + "15",
    borderColor: colors.accent + "25",
  },
  metaPillAccentText: {
    color: colors.accent,
  },
  historyCardSkills: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyCardRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 44,
  },
  historyCardDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyDeleteBtn: {
    padding: 2,
  },
  historyViewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  historyViewBannerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
