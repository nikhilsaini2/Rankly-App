import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useToast } from "../../../components/atoms/Toast";
import { useAtsScore } from "../../../hooks/useAtsScore";
import {
  generateImprovedResume,
  type ImprovedResumeResult,
} from "../../../services/resume/improveResumeService";
import { saveResume } from "../../../services/resume/resumeHistoryStorage";
import { supabase } from "../../../services/supabase";
import { getElevation } from "../../../theme";
import { useAppTheme } from "../../../theme/useAppTheme";
import type { RootStackParamList } from "../../../types/navigation.types";
import type { ResumeFormData } from "../types/resume.types";
import { generateResumeHTML } from "../utils/resumeHTML";

type RouteProps = RouteProp<RootStackParamList, "ImprovedResumePreview">;

const LOADING_MESSAGES = [
  "Analyzing ATS gaps...",
  "Injecting missing keywords...",
  "Upgrading bullet points...",
  "Optimizing for recruiters...",
  "Finalizing your resume...",
];

export default function ImprovedResumePreviewScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const elevation = getElevation(theme);
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProps>();
  const toast = useToast();
  const { getScoreById } = useAtsScore();

  const { resumeId, scoreId } = route.params;

  type Phase = "loading" | "preview" | "error";
  const [phase, setPhase] = useState<Phase>("loading");
  const [msgIndex, setMsgIndex] = useState(0);
  const [result, setResult] = useState<ImprovedResumeResult | null>(null);
  const [html, setHtml] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const hasShownSuccessToast = useRef(false);
  const isProcessingRef = useRef(false);

  const isMounted = useRef(true);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  // ── Loading animation ──────────────────────────────────────
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    if (phase !== "loading") return;
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 900 }),
        withTiming(0.3, { duration: 900 }),
      ),
      -1,
      false,
    );
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Main pipeline ──────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1. Fetch ATS score report
        const atsReport = await getScoreById(scoreId);
        if (!atsReport) throw new Error("ATS report not found.");

        // 2. Fetch resume text from Supabase
        const { data: resumeRow, error: rErr } = await supabase
          .from("resumes")
          .select("extracted_text, raw_text, title, file_name")
          .eq("id", resumeId)
          .single();

        if (rErr || !resumeRow) throw new Error("Resume not found.");

        const resumeText =
          (resumeRow.extracted_text as string) ||
          (resumeRow.raw_text as string) ||
          "";

        if (!resumeText.trim()) {
          throw new Error(
            "Resume text is empty. Please re-upload your resume and analyze it first.",
          );
        }

        // 3. Call AI optimization engine
        const improved = await generateImprovedResume({
          resumeText,
          atsReport,
          meta: {
            title: resumeRow.title as string,
            fileName: resumeRow.file_name as string,
          },
        });

        if (!alive) return;

        // 4. Build form-compatible shape for HTML generator
        const formShape: ResumeFormData = {
          fullName: improved.contact.fullName,
          email: improved.contact.email,
          phone: improved.contact.phone,
          linkedin: improved.contact.linkedin,
          city: improved.contact.city,
          targetRole: improved.contact.targetRole,
          experienceLevel: "",
          industry: "",
          skills: improved.generatedResume.coreSkills.join(", "),
          experiences: [],
          degree: improved.education.degree,
          institution: improved.education.institution,
          graduationYear: improved.education.graduationYear,
          grade: improved.education.grade,
          certifications: "",
          languages: "",
          tone: "Professional",
          topAchievement: "",
          targetCompanies: "",
          specialInstructions: "",
        };

        const generatedHtml = generateResumeHTML(
          formShape,
          improved.generatedResume,
        );

        setResult(improved);
        setHtml(generatedHtml);
        setPhase("preview");

        // Save to unified history — fail-open, never blocks preview
        try {
          await saveResume({
            html: generatedHtml,
            rawData: improved.generatedResume,
            role: improved.contact.targetRole,
            fullName: improved.contact.fullName,
            experienceLevel: "",
            source: "ats-improve",
            formData: formShape,
          });
        } catch (err) {
          console.warn(
            "[ImprovedResumePreview] Failed to save to history",
            err,
          );
        }
      } catch (err: any) {
        if (!alive) return;
        const msg =
          err instanceof Error ? err.message : "Could not improve resume.";
        setErrorMsg(msg);
        setPhase("error");
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, scoreId]);

  // ── Single unified action: export (cached) then share ─────
  const handleExportAndShare = useCallback(async () => {
    if (isProcessingRef.current || !html) return;
    isProcessingRef.current = true;
    setExporting(true);

    try {
      let uri = pdfUri;

      // Use cached PDF — never regenerate
      if (!uri) {
        const { uri: newUri } = await Print.printToFileAsync({
          html,
          base64: false,
        });
        uri = newUri;
        setPdfUri(uri);

        // Toast fires exactly once, on first successful export
        if (!hasShownSuccessToast.current) {
          hasShownSuccessToast.current = true;
          toast("PDF ready to share ✓", "success");
        }
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Optimized Resume",
      });
    } catch {
      toast("Could not export PDF", "error");
    } finally {
      isProcessingRef.current = false;
      setExporting(false);
    }
  }, [html, pdfUri, toast]);

  // ── Loading phase ──────────────────────────────────────────
  if (phase === "loading") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 40,
          marginBottom: bottomInset + 30,
        }}
      >
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: theme.primary + "15",
            borderWidth: 1,
            borderColor: theme.primary + "30",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <Animated.View style={pulseStyle}>
            <Ionicons name="sparkles-outline" size={56} color={theme.primary} />
          </Animated.View>
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.textPrimary,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Improving your resume...
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: theme.textSecondary,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          {LOADING_MESSAGES[msgIndex]}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: msgIndex % 3 === i ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  msgIndex % 3 === i ? theme.primary : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  // ── Error phase ────────────────────────────────────────────
  if (phase === "error") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <Ionicons name="alert-circle-outline" size={64} color={theme.error} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: theme.textPrimary,
            textAlign: "center",
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Optimization failed
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: theme.textSecondary,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          {errorMsg}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 32,
          }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: "700", fontSize: 15 }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Preview phase ──────────────────────────────────────────
  const r = result!;
  const exp = r.generatedResume.enhancedExperiences;

  const cardStyle = {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 12,
    ...elevation.card,
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.background, paddingTop: 16 }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          style={{ padding: 4, marginRight: 8 }}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: theme.textPrimary,
            flex: 1,
            textAlign: "center",
            marginRight: 36,
          }}
        >
          Optimized Resume
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: bottomInset + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact card */}
        <View style={cardStyle}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: theme.textPrimary,
              letterSpacing: -0.3,
            }}
          >
            {r.contact.fullName || "Your Name"}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: theme.primary,
              marginTop: 2,
            }}
          >
            {r.contact.targetRole}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: theme.textSecondary,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            {[r.contact.email, r.contact.phone, r.contact.city]
              .filter(Boolean)
              .join("  •  ")}
          </Text>
          {r.contact.linkedin ? (
            <Text
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                marginTop: 2,
              }}
            >
              {r.contact.linkedin}
            </Text>
          ) : null}
        </View>

        {/* Summary */}
        <SectionCard theme={theme} title="Professional Summary">
          <Text
            style={{ fontSize: 14, color: theme.textPrimary, lineHeight: 22 }}
          >
            {r.generatedResume.professionalSummary}
          </Text>
        </SectionCard>

        {/* Experience */}
        {exp.length > 0 && (
          <SectionCard theme={theme} title="Work Experience">
            {exp.map((e, i) => (
              <View
                key={i}
                style={{ marginBottom: i < exp.length - 1 ? 16 : 0 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: theme.textPrimary,
                      flex: 1,
                    }}
                  >
                    {e.jobTitle}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.textSecondary,
                      marginLeft: 8,
                    }}
                  >
                    {e.duration}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSecondary,
                    fontStyle: "italic",
                    marginBottom: 8,
                  }}
                >
                  {e.company}
                </Text>
                {e.bulletPoints.slice(0, 4).map((bp, j) => (
                  <View
                    key={j}
                    style={{ flexDirection: "row", marginBottom: 4 }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: theme.primary,
                        marginRight: 8,
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: theme.textPrimary,
                        lineHeight: 20,
                      }}
                    >
                      {bp}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </SectionCard>
        )}

        {/* Education */}
        <SectionCard theme={theme} title="Education">
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.textPrimary,
                }}
              >
                {r.education.degree}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.textSecondary,
                  fontStyle: "italic",
                }}
              >
                {r.education.institution}
              </Text>
              {r.education.grade ? (
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  {r.education.grade}
                </Text>
              ) : null}
            </View>
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>
              {r.education.graduationYear}
            </Text>
          </View>
        </SectionCard>

        {/* Skills */}
        <SectionCard theme={theme} title="Core Skills">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {r.generatedResume.coreSkills.map((s, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: theme.primary + "18",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: theme.primary + "35",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.primary,
                  }}
                >
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      </ScrollView>

      {/* Sticky action bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 5,
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          gap: 10,
        }}
      >
        {/* Primary: single unified action */}
        <TouchableOpacity
          style={{
            height: 52,
            borderRadius: 14,
            backgroundColor: theme.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: exporting ? 0.6 : 1,
          }}
          onPress={handleExportAndShare}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color={theme.onPrimary} size="small" />
          ) : (
            <Ionicons name="share-outline" size={18} color={theme.onPrimary} />
          )}
          <Text style={{ color: theme.onPrimary, fontWeight: "700", fontSize: 15 }}>
            {exporting ? "Processing..." : "Download & Share PDF"}
          </Text>
        </TouchableOpacity>

        {/* Secondary: navigate away */}
        <TouchableOpacity
          style={{
            height: 44,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => navigation.goBack()}
          disabled={exporting}
        >
          <Text
            style={{
              color: theme.textSecondary,
              fontWeight: "500",
              fontSize: 14,
            }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function SectionCard({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useAppTheme>;
}) {
  const elevation = getElevation(theme);
  const cardStyle = {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 12,
    ...elevation.card,
  };

  return (
    <View style={cardStyle}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: theme.textSecondary,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
