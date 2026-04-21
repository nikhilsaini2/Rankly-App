import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { useToast } from "../../../components/atoms/Toast";
import { useAtsScore } from "../../../hooks/useAtsScore";
import { useProfile } from "../../../hooks/useProfile";
import { useResumeUpload } from "../../../hooks/useResumeUpload";
import {
  canUploadResume,
  getResumeLimit,
} from "../../../services/premium/premiumService";
import { fetchResumeScreenData } from "../../../services/resume/resumeService";
import { useAppTheme } from "../../../theme/useAppTheme";
import type { ResumeRow } from "../../../types/common.types";
import { AtsScoreSummary } from "../../../types/common.types";
import type {
  RootStackParamList,
  RootTabParamList,
} from "../../../types/navigation.types";
import { AnalyzeModal } from "../components/AnalyzeModal";
import { FeatureRow } from "../components/FeatureRow";
import { ResumeAnalyzingOverlay } from "../components/ResumeAnalyzingOverlay";
import { ResumeCard } from "../components/ResumeCard";
import { UploadingOverlay } from "../components/Uploadingoverlay";
import { createResumeScreenStyles } from "../styles";

function getLatestAtsScore(resume: ResumeRow): AtsScoreSummary | null {
  if (!resume.ats_scores?.length) return null;
  return [...resume.ats_scores].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

export default function ResumeScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const theme = useAppTheme();
  const styles = createResumeScreenStyles(theme);
  const { user } = useProfile();
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const rootNav = navigation.getParent() as
    | NavigationProp<RootStackParamList>
    | undefined;

  const { pickResume, uploadResume, uploading, progress, deleteResume } =
    useResumeUpload();
  const { scoring, scoreResume } = useAtsScore();

  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeResumeId, setAnalyzeResumeId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analyzingInProgress, setAnalyzingInProgress] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [pendingAnalyzeId, setPendingAnalyzeId] = useState<string | null>(null);
  const didInitialLoad = useRef(false);

  const screenAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0.12);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenAnim.value,
    transform: [{ translateY: interpolate(screenAnim.value, [0, 1], [16, 0]) }],
  }));

  useEffect(() => {
    screenAnim.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
    glowAnim.value = withRepeat(withTiming(0.22, { duration: 2000 }), -1, true);
  }, [screenAnim, glowAnim]);

  const refreshData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchResumeScreenData();
      setResumes(data.resumes);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData(didInitialLoad.current);
      didInitialLoad.current = true;
    }, [refreshData])
  );

  async function handleAnalyze(resumeId: string, jd?: string) {
    setAnalyzingInProgress(true);
    setAnalyzeError(null);
    try {
      const mapped = await scoreResume(resumeId, jd);
      toast("ATS score ready", "success");
      await refreshData(true);
      if (mapped) {
        rootNav?.navigate("AtsScore", { resumeId, scoreId: mapped.id });
      }
    } catch (e) {
      const msg = e instanceof Error && e.message === "GEMINI_API_ERROR"
        ? "AI processing failed. Try again later."
        : "Could not score resume. Please try again.";
      setAnalyzeError(msg);
      setPendingAnalyzeId(resumeId);
      toast(msg, "error");
    } finally {
      setAnalyzingInProgress(false);
    }
  }

  async function onUpload() {
    const plan = user?.plan === "pro" ? "pro" : "free";
    const limit = getResumeLimit(plan);
    if (!canUploadResume(plan, resumes.length)) {
      Alert.alert(
        "Resume limit reached",
        limit === null
          ? "You have reached the current upload limit."
          : `Free plan allows up to ${limit} resumes. Delete one to upload another.`,
        [{ text: "Got it", style: "default" }],
      );
      return;
    }
    try {
      const file = await pickResume();
      if (!file) return;

      const uploaded = await uploadResume(file);

      // Resolve resume ID
      let resumeId: string | null = uploaded?.id ?? null;
      if (!resumeId) {
        const data = await fetchResumeScreenData();
        resumeId = data.resumes[0]?.id ?? null;
      }

      if (resumeId) {
        // Refresh list BEFORE analyzing so the resume card is visible
        // even if analysis fails — user won't see empty screen
        await refreshData(true);
        setAnalyzingInProgress(true);
        await handleAnalyze(resumeId);
      } else {
        refreshData(true);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    }
  }

  async function onAnalyze() {
    if (!analyzeResumeId) return;
    setAnalyzeOpen(false);
    await handleAnalyze(analyzeResumeId, jobDescription.trim() || undefined);
  }

  async function onDelete(item: ResumeRow) {
    Alert.alert(
      "Remove resume",
      "This will permanently delete this resume and all its scores.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteResume(item.id, item.fileUrl);
              toast("Resume removed", "success");
              refreshData(true);
            } catch {
              toast("Delete failed", "error");
            }
          },
        },
      ],
    );
  }

  function openAnalyze(id: string) {
    setAnalyzeResumeId(id);
    setJobDescription("");
    setAnalyzeOpen(true);
  }

  async function retryAnalyze() {
    if (!pendingAnalyzeId) return;
    setAnalyzeError(null);
    setAnalyzingInProgress(true);
    await handleAnalyze(pendingAnalyzeId);
  }

  if (loading) {
    return (
      <Reanimated.View style={[{ flex: 1 }, screenStyle]}>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={theme.primary} />
          <Text style={{ marginTop: 12, color: theme.textSecondary }}>
            Loading...
          </Text>
        </View>
      </Reanimated.View>
    );
  }

  if (resumes.length === 0 && !uploading && !analyzingInProgress) {
    return (
      <Reanimated.View style={[{ flex: 1 }, screenStyle]}>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.background }}
          contentContainerStyle={[
            styles.emptyScroll,
            { paddingTop: insets.top + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyIllustration} />

          <View style={styles.emptyBadge}>
            <Ionicons
              name="newspaper-outline"
              size={60}
              color={theme.accent}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <View style={styles.emptyBadgeDot} />
              <Text style={styles.emptyBadgeTxt}>
                AI-powered analysis ready
              </Text>
            </View>
          </View>

          <Text style={styles.emptyHeading}>No resume uploaded yet</Text>
          <Text style={styles.emptySub}>
            Upload your PDF and get an instant ATS score, keyword gaps, and AI
            feedback.
          </Text>

          <View style={styles.emptyFeatureList}>
            <FeatureRow
              iconName="analytics-outline"
              iconColor={theme.primary}
              iconBg="rgba(108,99,255,0.10)"
              title="ATS Score"
              subtitle="0–100 score across 4 metrics"
            />
            <FeatureRow
              iconName="search-outline"
              iconColor={theme.accent}
              iconBg="rgba(0,212,170,0.08)"
              title="Keyword analysis"
              subtitle="Found & missing keywords"
            />
            <FeatureRow
              iconName="chatbubble-outline"
              iconColor="#8B5CF6"
              iconBg="rgba(139,92,246,0.10)"
              title="AI feedback"
              subtitle="Strengths & improvements"
            />
          </View>

          <PressableScale
            onPress={onUpload}
            disabled={uploading}
            style={styles.emptyUploadBtn}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={styles.emptyUploadGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {uploading ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color={theme.onPrimary}
                  />
                  <Text style={styles.emptyUploadTxt}>Upload resume</Text>
                </>
              )}
            </LinearGradient>
          </PressableScale>

          <View style={styles.emptySupportRow}>
            <Text style={styles.emptySupportTxt}>PDF</Text>
            <Text style={styles.emptySupportDot}>·</Text>
            <Text style={styles.emptySupportTxt}>Max 5 MB</Text>
          </View>
        </ScrollView>

        <UploadingOverlay visible={uploading} progress={progress} />
        <ResumeAnalyzingOverlay visible={analyzingInProgress} />
      </Reanimated.View>
    );
  }

  return (
    <Reanimated.View style={[{ flex: 1 }, screenStyle]}>
      <View style={styles.root}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.pageTitle}>Your resumes</Text>
            <Text style={styles.resumeCountLabel}>
              {resumes.length} {resumes.length === 1 ? "document" : "documents"}
            </Text>
          </View>
          <PressableScale
            onPress={onUpload}
            disabled={uploading}
            style={styles.uploadIconBtn}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={styles.uploadIconBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {uploading ? (
                <ActivityIndicator color={theme.onPrimary} size="small" />
              ) : (
                <Ionicons name="add" size={22} color={theme.onPrimary} />
              )}
            </LinearGradient>
          </PressableScale>
        </View>

        <ResumeAnalyzingOverlay visible={analyzingInProgress} />

        {analyzeError && !analyzingInProgress && (
          <View style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: "rgba(239,68,68,0.10)",
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.35)",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}>
            <Ionicons name="warning-outline" size={18} color={theme.danger} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.danger, fontSize: 13, fontWeight: "600" }}>
                Analysis failed
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                {analyzeError}
              </Text>
            </View>
            <TouchableOpacity
              onPress={retryAnalyze}
              style={{
                backgroundColor: theme.danger,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: theme.onPrimary, fontSize: 12, fontWeight: "700" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={resumes}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item, index }) => (
            <ResumeCard
              item={item}
              latestScore={getLatestAtsScore(item)}
              scoring={scoring}
              index={index}
              rootNav={rootNav}
              onAnalyze={openAnalyze}
              onDelete={onDelete}
            />
          )}
        />

        <AnalyzeModal
          visible={analyzeOpen}
          scoring={scoring}
          jobDescription={jobDescription}
          onChangeText={setJobDescription}
          onAnalyze={onAnalyze}
          onClose={() => setAnalyzeOpen(false)}
        />
      </View>

      <UploadingOverlay visible={uploading} progress={progress} />
    </Reanimated.View>
  );
}
