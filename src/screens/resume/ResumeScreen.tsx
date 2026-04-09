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
import { PressableScale } from "../../components/atoms/PressableScale";
import { useToast } from "../../components/atoms/Toast";
import { useAtsScore } from "../../hooks/useAtsScore";
import { useProfile } from "../../hooks/useProfile";
import { useResumeUpload } from "../../hooks/useResumeUpload";
import { fetchResumeScreenData } from "../../services/resume/resumeService";
import { colors } from "../../theme/color";
import type { ResumeRow } from "../../types/common.types";
import { AtsScoreSummary } from "../../types/common.types";
import type {
  RootStackParamList,
  RootTabParamList,
} from "../../types/navigation.types";
import { AnalyzeModal } from "./components/AnalyzeModal";
import { FeatureRow } from "./components/FeatureRow";
import { ResumeAnalyzingOverlay } from "./components/ResumeAnalyzingOverlay";
import { ResumeCard } from "./components/ResumeCard";
import { UploadingOverlay } from "./components/Uploadingoverlay";
import { styles } from "./styles";

function getLatestAtsScore(resume: ResumeRow): AtsScoreSummary | null {
  if (!resume.ats_scores?.length) return null;
  return [...resume.ats_scores].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

export default function ResumeScreen() {
  const needsReload = useRef(false);
  const insets = useSafeAreaInsets();
  const toast = useToast();
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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchResumeScreenData();
      setResumes(data.resumes);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!didInitialLoad.current) {
        didInitialLoad.current = true;
        void load();
      } else if (needsReload.current) {
        needsReload.current = false;
        void load();
      }
    }, [load]),
  );

  async function onUpload() {
    if (user?.plan === "free" && resumes.length >= 3) {
      Alert.alert(
        "Resume limit reached",
        "Free plan allows up to 3 resumes. Delete one to upload another.",
        [{ text: "Got it", style: "default" }],
      );
      return;
    }
    try {
      const file = await pickResume();
      if (!file) return;
      await uploadResume(file);
      toast("Resume uploaded successfully", "success");
      needsReload.current = true;
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    }
  }

  async function onAnalyze() {
    if (!analyzeResumeId) return;
    setAnalyzeOpen(false);
    setAnalyzingInProgress(true);
    try {
      const mapped = await scoreResume(
        analyzeResumeId,
        jobDescription.trim() || undefined,
      );
      toast("ATS score ready", "success");
      needsReload.current = true;
      await load();
      await new Promise((r) => setTimeout(r, 100));
      if (mapped) {
        rootNav?.navigate("AtsScore", {
          resumeId: analyzeResumeId,
          scoreId: mapped.id,
        });
      }
    } catch {
      toast("Could not score resume", "error");
    } finally {
      setAnalyzingInProgress(false);
    }
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
              load();
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

  if (loading) {
    return (
      <Reanimated.View style={[{ flex: 1 }, screenStyle]}>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>
            Loading...
          </Text>
        </View>
      </Reanimated.View>
    );
  }

  if (resumes.length === 0) {
    return (
      <Reanimated.View style={[{ flex: 1 }, screenStyle]}>
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
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
              color={colors.accent}
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
              iconColor={colors.primary}
              iconBg="rgba(108,99,255,0.10)"
              title="ATS Score"
              subtitle="0–100 score across 4 metrics"
            />
            <FeatureRow
              iconName="search-outline"
              iconColor={colors.accent}
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
              colors={[colors.primary, colors.primaryDark]}
              style={styles.emptyUploadGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color="#fff"
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
              colors={[colors.primary, colors.primaryDark]}
              style={styles.uploadIconBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="add" size={22} color="#fff" />
              )}
            </LinearGradient>
          </PressableScale>
        </View>

        <ResumeAnalyzingOverlay visible={analyzingInProgress} />

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
