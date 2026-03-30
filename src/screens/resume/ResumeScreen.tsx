import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
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
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import { PressableScale } from "../../components/atoms/PressableScale";
import { Skeleton } from "../../components/atoms/Skeleton";
import { useToast } from "../../components/atoms/Toast";
import { useAtsScore } from "../../hooks/useAtsScore";
import { useProfile } from "../../hooks/useProfile";
import { useResumeUpload } from "../../hooks/useResumeUpload";
import { fetchResumeScreenData } from "../../services/resume/resumeService";
import { colors } from "../../theme/color";
import type { ResumeRow } from "../../types/common.types";
import type {
  RootStackParamList,
  RootTabParamList,
} from "../../types/navigation.types";
import { formatResumeDate, truncateFilename } from "../../utils/format";

type ScoreInfo = { score: number; scoreId: string };

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
  const [scores, setScores] = useState<Record<string, ScoreInfo>>({});
  const [loading, setLoading] = useState(true);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeResumeId, setAnalyzeResumeId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const didInitialLoad = useRef(false);

  const screenAnim = useSharedValue(0);
  React.useEffect(() => {
    screenAnim.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [screenAnim]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenAnim.value,
    transform: [{ translateY: interpolate(screenAnim.value, [0, 1], [16, 0]) }],
  }));

  const glowAnim = useSharedValue(0.12);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));
  React.useEffect(() => {
    glowAnim.value = withRepeat(withTiming(0.22, { duration: 2000 }), -1, true);
  }, [glowAnim]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchResumeScreenData();
      setScores(data.scores as Record<string, ScoreInfo>);
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

  React.useEffect(() => {
    if (progress > 0 && progress < 1) {
      Animated.timing(progressOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (progress >= 1) {
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(progressOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [progress, progressOpacity]);

  async function onUpload() {
    try {
      if (user?.plan === "free" && resumes.length >= 3) {
        Alert.alert(
          "Resume limit",
          "Free plan allows 3 resumes. Delete one to upload another.",
        );
        return;
      }
      const file = await pickResume();
      if (!file) return;
      await uploadResume(file);
      toast("Resume uploaded", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    }
  }

  function openAnalyze(id: string) {
    setAnalyzeResumeId(id);
    setJobDescription("");
    setAnalyzeOpen(true);
  }

  async function runAnalyze() {
    if (!analyzeResumeId) return;
    try {
      const mapped = await scoreResume(
        analyzeResumeId,
        jobDescription.trim() || undefined,
      );
      setAnalyzeOpen(false);
      toast("ATS score ready", "success");
      load();
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
          <Text style={styles.pageTitle}>Resumes</Text>

          <View style={styles.quickStatsSkWrap}>
            <View style={styles.quickStatsSkCell}>
              <Skeleton style={styles.quickStatsSkNum} radius={10} />
              <Skeleton style={styles.quickStatsSkLab} radius={8} />
            </View>
            <View style={[styles.quickStatsSkCell, styles.quickStatsSkDivider]}>
              <Skeleton style={styles.quickStatsSkNum} radius={10} />
              <Skeleton style={styles.quickStatsSkLab} radius={8} />
            </View>
            <View style={[styles.quickStatsSkCell, styles.quickStatsSkDivider]}>
              <Skeleton style={styles.quickStatsSkNum} radius={10} />
              <Skeleton style={styles.quickStatsSkLab} radius={8} />
            </View>
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
        <View style={[styles.empty, { paddingTop: insets.top + 30 }]}>
          {progressBar}

          <View style={styles.emptyPremiumInner}>
            <Reanimated.View
              pointerEvents="none"
              style={[styles.emptyGlow, glowStyle]}
            >
              <LinearGradient
                colors={[colors.primary, "transparent"]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 1, y: 1 }}
              />
            </Reanimated.View>

            <View style={styles.emptyIllustrationWrap}>
              <ResumeEmptyIllustration />
            </View>

            <Text style={styles.emptyPremiumTitle}>Your Career Hub Awaits</Text>
            <Text style={styles.emptyPremiumSub}>
              Upload your resume and let Rankly's AI analyze your ATS score,
              identify gaps, and guide your next career move.
            </Text>

            <View style={styles.emptyCtaRow}>
              <PressableScale
                onPress={onUpload}
                disabled={uploading}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.emptyPrimaryBtn}
                >
                  {uploading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.emptyPrimaryBtnTxt}>Upload Resume</Text>
                  )}
                </LinearGradient>
              </PressableScale>

              <PressableScale
                onPress={onUpload}
                disabled={uploading}
                style={{ flex: 1, marginLeft: 10 }}
              >
                <View style={styles.emptyGhostBtn}>
                  <Text style={styles.emptyGhostBtnTxt}>
                    Build from scratch
                  </Text>
                </View>
              </PressableScale>
            </View>

            <Text style={styles.emptyDividerTxt}>
              ──── or drag &amp; drop ─────
            </Text>

            <View style={styles.supportRow}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.supportTxt}>Supported: PDF</Text>
              <Text style={styles.supportDot}>·</Text>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.supportTxt}>Max size: 5MB</Text>
            </View>
          </View>
        </View>
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
          keyExtractor={(i) => i.id}
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
          renderItem={({ item }) => {
            const sc = scores[item.id];
            const fname = item.fileName ?? item.title;
            return (
              <View style={styles.card}>
                <View style={styles.pdfIcon}>
                  <Text style={styles.pdfTxt}>PDF</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {truncateFilename(fname)}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {formatResumeDate(item.createdAt)}
                  </Text>
                  <View
                    style={[
                      styles.scorePill,
                      sc ? styles.scorePillOn : styles.scorePillOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.scorePillTxt,
                        !sc ? { color: colors.textMuted } : null,
                      ]}
                    >
                      {sc ? `ATS ${sc.score}` : "Not Scored"}
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
                    <PressableScale
                      style={styles.outlineBtn}
                      onPress={() => openAnalyze(item.id)}
                      disabled={scoring}
                    >
                      <Text style={styles.outlineBtnTxt}>Get ATS Score</Text>
                    </PressableScale>
                    {sc ? (
                      <PressableScale
                        style={styles.outlineBtn}
                        onPress={() =>
                          rootNav?.navigate("AtsScore", {
                            resumeId: item.id,
                            scoreId: sc.scoreId,
                          })
                        }
                      >
                        <Text style={styles.outlineBtnTxt}>View Report</Text>
                      </PressableScale>
                    ) : null}
                    <TouchableOpacity onPress={() => onDelete(item)}>
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color={colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
        <PressableScale
          style={[styles.fab, { bottom: 88 + insets.bottom }]}
          onPress={onUpload}
          disabled={uploading}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.fabInner}
          >
            {uploading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Ionicons name="add" size={28} color={colors.textPrimary} />
            )}
          </LinearGradient>
        </PressableScale>

        <Modal
          visible={analyzeOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setAnalyzeOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Analyze resume</Text>
              <Text style={styles.modalSub}>
                Job description (optional — for better accuracy)
              </Text>
              <TextInput
                style={styles.jdInput}
                placeholder="Paste job description…"
                placeholderTextColor={colors.textMuted}
                value={jobDescription}
                onChangeText={setJobDescription}
                multiline
              />
              <PressableScale
                onPress={runAnalyze}
                disabled={scoring}
                style={{ marginTop: 16 }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.modalCta}
                >
                  {scoring ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.modalCtaTxt}>Analyze Resume</Text>
                  )}
                </LinearGradient>
              </PressableScale>
              <TouchableOpacity
                style={{ marginTop: 12 }}
                onPress={() => setAnalyzeOpen(false)}
              >
                <Text style={{ color: colors.textMuted, textAlign: "center" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Reanimated.View>
  );
}

function ResumeEmptyIllustration() {
  return (
    <Svg width={160} height={180} viewBox="0 0 80 100">
      <Defs>
        <SvgLinearGradient id="docGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.surfaceAlt} />
          <Stop offset="100%" stopColor={colors.surface} />
        </SvgLinearGradient>
        <Filter id="blur">
          <FeGaussianBlur stdDeviation={3} />
        </Filter>
      </Defs>

      {/* Subtle glow/shadow behind the document */}
      <Ellipse
        cx={40}
        cy={88}
        rx={26}
        ry={10}
        fill={colors.primary}
        opacity={0.2}
        filter="url(#blur)"
      />

      <Rect
        x={10}
        y={14}
        width={60}
        height={72}
        rx={12}
        fill="url(#docGrad)"
        stroke={colors.primary}
        strokeOpacity={0.5}
        strokeWidth={1.2}
      />

      {/* 3 horizontal "text" lines */}
      <Rect
        x={20}
        y={38}
        width={48}
        height={3}
        rx={2}
        fill={colors.border}
        opacity={0.9}
      />
      <Rect
        x={24}
        y={52}
        width={36}
        height={3}
        rx={2}
        fill={colors.border}
        opacity={0.85}
      />
      <Rect
        x={22}
        y={66}
        width={42}
        height={3}
        rx={2}
        fill={colors.border}
        opacity={0.8}
      />

      {/* Floating badge (top-right) */}
      <Circle
        cx={62}
        cy={24}
        r={7}
        fill="rgba(108,99,255,0.12)"
        stroke={colors.primary}
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      <Path
        d="M62 18 L63.4 22 L68 23 L63.4 24 L62 29 L60.6 24 L56 23 L60.6 22 Z"
        fill={colors.primary}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  topProg: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  empty: { flex: 1, paddingHorizontal: 28, alignItems: "center" },
  loadingWrap: { flex: 1, paddingHorizontal: 28, alignItems: "center" },

  quickStatsSkWrap: {
    width: "100%",
    flexDirection: "row",
    gap: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8,
  },
  quickStatsSkCell: { flex: 1, alignItems: "center" },
  quickStatsSkDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  quickStatsSkNum: { width: "55%", height: 22 },
  quickStatsSkLab: { width: "70%", height: 12, marginTop: 10 },

  resumeSkList: { width: "100%", marginTop: 16 },
  resumeSkCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  resumeSkPdf: { width: 44, height: 52 },
  resumeSkTitle: { width: "72%", height: 14 },
  resumeSkMeta: { width: "44%", height: 10, marginTop: 6 },
  resumeSkPill: { width: "44%", height: 18, marginTop: 12 },
  resumeSkBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  resumeSkBtn: { flex: 1, height: 34 },

  emptyPremiumInner: { alignItems: "center", width: "100%" },
  emptyGlow: {
    position: "absolute",
    top: -70,
    left: -40,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  emptyIllustrationWrap: { marginTop: 12 },
  emptyPremiumTitle: {
    marginTop: 14,
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  emptyPremiumSub: {
    marginTop: 10,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyCtaRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 18,
  },
  emptyPrimaryBtn: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPrimaryBtnTxt: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 14,
  },
  emptyGhostBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyGhostBtnTxt: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  emptyDividerTxt: {
    marginTop: 16,
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 12,
  },
  supportRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  supportTxt: { color: colors.textSecondary, fontSize: 12 },
  supportDot: {
    color: colors.textSecondary,
    fontSize: 12,
    marginHorizontal: -2,
  },

  emoji: { fontSize: 56, marginTop: 8 },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySub: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
    fontSize: 15,
  },
  primaryBtn: {
    marginTop: 28,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minWidth: 240,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  progTrack: {
    height: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  progFill: { height: 4, backgroundColor: colors.accent, borderRadius: 4 },
  analyzingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analyzingTxt: { color: colors.textSecondary, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: 14,
  },
  pdfIcon: {
    width: 44,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfTxt: { color: colors.textPrimary, fontWeight: "800", fontSize: 11 },
  cardTitle: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
  cardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  scorePill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  scorePillOn: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  scorePillOff: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  scorePillTxt: { fontWeight: "700", fontSize: 12, color: colors.accent },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  outlineBtnTxt: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 6,
  },
  fabInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalSub: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  jdInput: {
    minHeight: 100,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.textPrimary,
    textAlignVertical: "top",
    fontSize: 15,
  },
  modalCta: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  modalCtaTxt: { color: colors.textPrimary, fontWeight: "800", fontSize: 16 },
});
