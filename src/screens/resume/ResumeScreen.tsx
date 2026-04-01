import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { Skeleton } from "../../components/atoms/Skeleton";
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
import { ResumeCard } from "./components/ResumeCard";
import { ResumeEmptyIllustration } from "./components/ResumeEmptyIllustration";
import { styles } from "./styles";

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
  const progressOpacity = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    if (progress > 0 && progress < 1) {
      Animated.timing(progressOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (progress >= 1) {
      Animated.timing(progressOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [progress, progressOpacity]);

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
      if (didInitialLoad.current) return;
      didInitialLoad.current = true;
      void load();
    }, [load]),
  );

  async function onUpload() {
    if (user?.plan === "free" && resumes.length >= 3) {
      Alert.alert(
        "Resume limit",
        "Free plan allows 3 resumes. Delete one to upload another.",
      );
      return;
    }
    try {
      const file = await pickResume();
      if (!file) return;
      await uploadResume(file);
      toast("Resume uploaded", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    }
  }

  async function onAnalyze() {
    if (!analyzeResumeId) return;
    try {
      const mapped = await scoreResume(
        analyzeResumeId,
        jobDescription.trim() || undefined,
      );
      setAnalyzeOpen(false);
      toast("ATS score ready", "success");
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
    }
  }

  async function onDelete(item: ResumeRow) {
    try {
      await deleteResume(item.id, item.fileUrl);
      toast("Resume removed", "success");
      load();
    } catch {
      toast("Delete failed", "error");
    }
  }

  function openAnalyze(id: string) {
    setAnalyzeResumeId(id);
    setJobDescription("");
    setAnalyzeOpen(true);
  }

  const progressBar =
    progress > 0 && progress <= 1 ? (
      <Animated.View
        style={[
          styles.topProg,
          { opacity: progressOpacity, paddingTop: insets.top + 4 },
        ]}
      >
        <View style={styles.progTrack}>
          <View style={[styles.progFill, { width: `${progress * 100}%` }]} />
        </View>
      </Animated.View>
    ) : null;

  if (loading) {
    return (
      <Reanimated.View style={[{ flex: 1 }, screenStyle]}>
        <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
          <Text style={[styles.pageTitle, { alignSelf: "flex-start" }]}>
            Your resumes
          </Text>
          <View style={styles.quickStatsSkWrap}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.quickStatsSkCell,
                  i > 0 && styles.quickStatsSkDivider,
                ]}
              >
                <Skeleton style={styles.quickStatsSkNum} radius={10} />
                <Skeleton style={styles.quickStatsSkLab} radius={8} />
              </View>
            ))}
          </View>
          <View style={styles.resumeSkList}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.resumeSkCard}>
                <Skeleton style={styles.resumeSkPdf} radius={10} />
                <View style={{ flex: 1 }}>
                  <Skeleton style={styles.resumeSkTitle} radius={8} />
                  <Skeleton style={styles.resumeSkMeta} radius={8} />
                  <Skeleton style={styles.resumeSkPill} radius={10} />
                  <View style={styles.resumeSkBtnRow}>
                    <Skeleton style={styles.resumeSkBtn} radius={10} />
                    <Skeleton style={styles.resumeSkBtn} radius={10} />
                  </View>
                </View>
              </View>
            ))}
          </View>
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
          {progressBar}

          {/* Stacked-document illustration */}
          <View style={styles.emptyIllustration}>
            <ResumeEmptyIllustration />
          </View>

          {/* Status badge */}
          <View style={styles.emptyBadge}>
            <View style={styles.emptyBadgeDot} />
            <Text style={styles.emptyBadgeTxt}>AI-powered analysis ready</Text>
          </View>

          <Text style={styles.emptyHeading}>No resume uploaded yet</Text>
          <Text style={styles.emptySub}>
            Upload your PDF and get an instant ATS score, keyword gaps, and AI
            feedback.
          </Text>

          {/* Feature rows */}
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

          {/* Upload CTA */}
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

          {/* Format hint */}
          <View style={styles.emptySupportRow}>
            <Text style={styles.emptySupportTxt}>PDF</Text>
            <Text style={styles.emptySupportDot}>·</Text>
            <Text style={styles.emptySupportTxt}>Max 5 MB</Text>
          </View>
        </ScrollView>
      </Reanimated.View>
    );
  }

  return (
    <Reanimated.View style={[{ flex: 1 }, screenStyle]}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {progressBar}
        <Text style={styles.pageTitle}>Your resumes</Text>
        <FlatList
          data={resumes}
          keyExtractor={(i) => i.id + Math.random().toString()}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            scoring ? (
              <View style={styles.analyzingBanner}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.analyzingTxt}>
                  AI is analyzing your resume…
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ResumeCard
              item={item}
              latestScore={getLatestAtsScore(item)}
              scoring={scoring}
              rootNav={rootNav}
              onAnalyze={openAnalyze}
              onDelete={onDelete}
            />
          )}
        />
        <PressableScale
          style={[styles.fab, { bottom: 88 + insets.bottom }]}
          onPress={onUpload}
          disabled={uploading}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.fabInner}
          >
            {uploading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Ionicons name="add" size={28} color={colors.textPrimary} />
            )}
          </LinearGradient>
        </PressableScale>
        <AnalyzeModal
          visible={analyzeOpen}
          scoring={scoring}
          jobDescription={jobDescription}
          onChangeText={setJobDescription}
          onAnalyze={onAnalyze}
          onClose={() => setAnalyzeOpen(false)}
        />
      </View>
    </Reanimated.View>
  );
}
