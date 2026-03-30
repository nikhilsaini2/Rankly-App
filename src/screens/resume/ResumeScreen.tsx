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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "../../components/atoms/PressableScale";
import { useToast } from "../../components/atoms/Toast";
import { useAtsScore } from "../../hooks/useAtsScore";
import { useProfile } from "../../hooks/useProfile";
import { useResumeUpload } from "../../hooks/useResumeUpload";
import { logout } from "../../services/profile/profileService";
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
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.pageTitle}>Resumes</Text>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (resumes.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + 40 }]}>
        {progressBar}
        <Text style={styles.pageTitle}>Resumes</Text>
        <Text style={styles.emoji}>📄</Text>
        <Text style={styles.emptyTitle}>No resumes yet</Text>
        <Text style={styles.emptySub}>
          Upload your resume to get your ATS score and personalized AI feedback
        </Text>
        <PressableScale onPress={onUpload} disabled={uploading}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.primaryBtn}
          >
            {uploading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.primaryBtnText}>Upload Resume</Text>
            )}
          </LinearGradient>
        </PressableScale>
      </View>
    );
  }

  return (
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
