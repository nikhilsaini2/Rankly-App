import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../components/atoms/Toast";
import type { ResumeHistoryRecord } from "../../../services/resume/resumeHistoryService";
import { useAppTheme } from "../../../theme/useAppTheme";
import type { RootStackParamList } from "../../../types/navigation.types";
import { ResumeRenderer } from "../components/ResumeRenderer";
import { useResumeHistory } from "../hooks/useResumeHistory";
import type { ResumeFormData } from "../types/resume.types";
import { generateResumeHTML } from "../utils/resumeHTML";

// ─── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── History card ─────────────────────────────────────────────────────────────
interface CardProps {
  entry: ResumeHistoryRecord;
  onPress: (entry: ResumeHistoryRecord) => void;
  onDelete: (entry: ResumeHistoryRecord) => void;
}

const ResumeHistoryCard = memo(({ entry, onPress, onDelete }: CardProps) => {
  const theme = useAppTheme();
  const handleDelete = () => {
    Alert.alert("Delete Resume", "Remove this resume from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(entry),
      },
    ]);
  };

  const isImproved = entry.meta.source === "ats-improve";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(entry)}
      style={{
        backgroundColor: theme.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: isImproved
            ? theme.accent + "18"
            : theme.primary + "18",
          borderWidth: 1,
          borderColor: isImproved
            ? theme.accent + "30"
            : theme.primary + "30",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ionicons
          name={isImproved ? "sparkles-outline" : "document-text-outline"}
          size={20}
          color={isImproved ? theme.accent : theme.primary}
        />
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: theme.textPrimary }}
          numberOfLines={1}
        >
          {entry.title}
        </Text>
        {entry.meta.role ? (
          <Text
            style={{ fontSize: 13, color: theme.primary, fontWeight: "500" }}
            numberOfLines={1}
          >
            {entry.meta.role}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            gap: 6,
            alignItems: "center",
            marginTop: 2,
          }}
        >
          {/* Source badge */}
          <View
            style={{
              backgroundColor: isImproved
                ? theme.accent + "18"
                : theme.primary + "18",
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: isImproved
                ? theme.accent + "35"
                : theme.primary + "35",
            }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: isImproved ? theme.accent : theme.primary,
                  fontWeight: "600",
                }}
              >
                {isImproved ? "AI Optimized" : "Generated"}
              </Text>
            </View>
          <View
            style={{
              backgroundColor:
                entry.source === "cloud"
                  ? theme.warning + "16"
                  : theme.surfaceAlt,
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor:
                entry.source === "cloud"
                  ? theme.warning + "40"
                  : theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color:
                  entry.source === "cloud" ? theme.warning : theme.textSecondary,
                fontWeight: "600",
              }}
            >
              {entry.source === "cloud" ? "Cloud" : "Local"}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textMuted }}>
            {relativeTime(entry.createdAt)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 6 }}
        >
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ResumeHistoryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;

  const { history, loading, fetchHistory, removeResume } = useResumeHistory();
  const [selectedEntry, setSelectedEntry] = useState<ResumeHistoryRecord | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const hasShownToastRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleBack = useCallback(() => {
    if (selectedEntry) {
      setSelectedEntry(null);
    } else {
      navigation.goBack();
    }
  }, [selectedEntry, navigation]);

  const handleSelect = useCallback((entry: ResumeHistoryRecord) => {
    setSelectedEntry(entry);
    // Reset export state for each new entry
    setPdfUri(null);
    hasShownToastRef.current = false;
    isProcessingRef.current = false;
  }, []);

  const toFullFormData = useCallback((formData?: Partial<ResumeFormData>): ResumeFormData => ({
    fullName: formData?.fullName ?? "",
    email: formData?.email ?? "",
    phone: formData?.phone ?? "",
    linkedin: formData?.linkedin ?? "",
    city: formData?.city ?? "",
    targetRole: formData?.targetRole ?? "",
    experienceLevel: formData?.experienceLevel ?? "",
    industry: formData?.industry ?? "",
    skills: formData?.skills ?? "",
    experiences: formData?.experiences ?? [],
    degree: formData?.degree ?? "",
    institution: formData?.institution ?? "",
    graduationYear: formData?.graduationYear ?? "",
    grade: formData?.grade ?? "",
    certifications: formData?.certifications ?? "",
    languages: formData?.languages ?? "",
    tone: formData?.tone ?? "",
    topAchievement: formData?.topAchievement ?? "",
    targetCompanies: formData?.targetCompanies ?? "",
    specialInstructions: formData?.specialInstructions ?? "",
  }), []);

  // ── Export + share handler (cached, locked, one-time toast) ────
  const handleExportAndShare = useCallback(async () => {
    if (isProcessingRef.current || !selectedEntry) return;
    isProcessingRef.current = true;
    setProcessing(true);

    try {
      let uri = pdfUri;

      if (!uri) {
        const html =
          selectedEntry.html ??
          generateResumeHTML(
            toFullFormData(selectedEntry.formData),
            selectedEntry.rawData,
          );
        const { uri: newUri } = await Print.printToFileAsync({
          html,
          base64: false,
        });
        uri = newUri;
        setPdfUri(uri);

        if (!hasShownToastRef.current) {
          hasShownToastRef.current = true;
          toast("PDF ready to share ✓", "success");
        }
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Resume",
      });
    } catch {
      toast("Could not export PDF", "error");
    } finally {
      isProcessingRef.current = false;
      setProcessing(false);
    }
  }, [selectedEntry, pdfUri, toast, toFullFormData]);

  // ── Preview view ────────────────────────────────────────────────
  if (selectedEntry) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: 16 }}>
        {/* Header */}
        <View
          style={{
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 4, marginRight: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: theme.textPrimary,
              }}
              numberOfLines={1}
            >
              {selectedEntry.title}
            </Text>
            {selectedEntry.meta.role ? (
              <Text style={{ fontSize: 12, color: theme.textMuted }}>
                {selectedEntry.meta.role} ·{" "}
                {relativeTime(selectedEntry.createdAt)} ·{" "}
                {selectedEntry.source === "cloud" ? "Cloud" : "This device"}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Resume content — single renderer, pixel-identical for all sources */}
        <ResumeRenderer
          generatedResume={selectedEntry.rawData}
          formData={selectedEntry.formData}
          onAction={handleExportAndShare}
          processing={processing}
          actionLabel="📄 Download & Share PDF"
          onBack={handleBack}
          backLabel="Back to History"
        />
      </View>
    );
  }

  // ── History list ────────────────────────────────────────────────
  return (
    <View
      style={{ flex: 1, backgroundColor: theme.background, paddingTop: 16 }}
    >
      {/* Header */}
      <View
        style={{
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4, marginRight: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: theme.textPrimary,
            flex: 1,
          }}
        >
          Resume History
        </Text>
        {history.length > 0 && (
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            {history.length} resume{history.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : history.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
            paddingBottom: insets.bottom + 60,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.accent + "14",
              borderWidth: 1,
              borderColor: theme.accent + "30",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="document-text-outline"
              size={36}
              color={theme.accent}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.textPrimary,
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            No resumes yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 28,
            }}
          >
            Build your first AI-powered resume to see it here.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 28,
            }}
            onPress={() => {
              navigation.navigate("ResumeBuilder");
            }}
          >
            <Text style={{ color: theme.onPrimary, fontWeight: "700", fontSize: 15 }}>
              Build Resume
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomInset + 24,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ResumeHistoryCard
              entry={item}
              onPress={handleSelect}
              onDelete={removeResume}
            />
          )}
        />
      )}
    </View>
  );
}
