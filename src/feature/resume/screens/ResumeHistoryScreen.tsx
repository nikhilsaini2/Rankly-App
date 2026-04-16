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
import type { ResumeHistoryEntry } from "../../../services/resume/resumeHistoryStorage";
import { colors } from "../../../theme/color";
import type { RootStackParamList } from "../../../types/navigation.types";
import { ResumeRenderer } from "../components/ResumeRenderer";
import { useResumeHistory } from "../hooks/useResumeHistory";

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
  entry: ResumeHistoryEntry;
  onPress: (entry: ResumeHistoryEntry) => void;
  onDelete: (id: string) => void;
}

const ResumeHistoryCard = memo(({ entry, onPress, onDelete }: CardProps) => {
  const handleDelete = () => {
    Alert.alert("Delete Resume", "Remove this resume from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(entry.id),
      },
    ]);
  };

  const isImproved = entry.meta.source === "ats-improve";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(entry)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
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
            ? colors.accent + "18"
            : colors.primary + "18",
          borderWidth: 1,
          borderColor: isImproved
            ? colors.accent + "30"
            : colors.primary + "30",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ionicons
          name={isImproved ? "sparkles-outline" : "document-text-outline"}
          size={20}
          color={isImproved ? colors.accent : colors.primary}
        />
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary }}
          numberOfLines={1}
        >
          {entry.title}
        </Text>
        {entry.meta.role ? (
          <Text
            style={{ fontSize: 13, color: colors.primary, fontWeight: "500" }}
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
                ? colors.accent + "18"
                : colors.primary + "18",
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: isImproved
                ? colors.accent + "35"
                : colors.primary + "35",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: isImproved ? colors.accent : colors.primary,
                fontWeight: "600",
              }}
            >
              {isImproved ? "AI Optimized" : "Generated"}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
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
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ResumeHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;

  const { history, loading, fetchHistory, removeResume } = useResumeHistory();
  const [selectedEntry, setSelectedEntry] = useState<ResumeHistoryEntry | null>(
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

  const handleSelect = useCallback((entry: ResumeHistoryEntry) => {
    setSelectedEntry(entry);
    // Reset export state for each new entry
    setPdfUri(null);
    hasShownToastRef.current = false;
    isProcessingRef.current = false;
  }, []);

  // ── Export + share handler (cached, locked, one-time toast) ────
  const handleExportAndShare = useCallback(async () => {
    if (isProcessingRef.current || !selectedEntry?.html) return;
    isProcessingRef.current = true;
    setProcessing(true);

    try {
      let uri = pdfUri;

      if (!uri) {
        const { uri: newUri } = await Print.printToFileAsync({
          html: selectedEntry.html,
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
  }, [selectedEntry, pdfUri, toast]);

  // ── Preview view ────────────────────────────────────────────────
  if (selectedEntry) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 16 }}>
        {/* Header */}
        <View
          style={{
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 4, marginRight: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.textPrimary,
              }}
              numberOfLines={1}
            >
              {selectedEntry.title}
            </Text>
            {selectedEntry.meta.role ? (
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {selectedEntry.meta.role} ·{" "}
                {relativeTime(selectedEntry.createdAt)}
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
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 16 }}
    >
      {/* Header */}
      <View
        style={{
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4, marginRight: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.textPrimary,
            flex: 1,
          }}
        >
          Resume History
        </Text>
        {history.length > 0 && (
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {history.length} resume{history.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={colors.primary} />
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
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="document-text-outline"
              size={36}
              color={colors.textMuted}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.textPrimary,
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            No resumes yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 28,
            }}
          >
            Build your first AI-powered resume to see it here.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 28,
            }}
            onPress={() => {
              navigation.navigate("ResumeBuilder");
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
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
