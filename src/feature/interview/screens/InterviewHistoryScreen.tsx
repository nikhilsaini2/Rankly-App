import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScoreRing } from "../../../components/atoms/ScoreRing";
import { colors } from "../../../theme/color";
import type { RootStackParamList } from "../../../types/navigation.types";
import { InterviewHistoryCard } from "../components/InterviewHistoryCard";
import { useInterviewHistory } from "../hooks/useInterviewHistory";
import type { InterviewReport } from "../services/interviewStorage";
import type { Answer } from "../types/interview.types";

// ─── Report detail view ───────────────────────────────────────────────────────
function ReportDetail({
  report,
  bottomInset,
}: {
  report: InterviewReport;
  bottomInset: number;
}) {
  function scoreColor(score: number): string {
    if (score >= 75) return colors.accent;
    if (score >= 50) return colors.warning;
    return colors.danger;
  }

  return (
    <FlatList
      data={report.answers}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: bottomInset + 24,
      }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          {/* Role + metadata row — sits just below the single screen header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              paddingTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textTransform: "capitalize",
                flex: 1,
              }}
            >
              {report.role} · {report.difficulty} · {report.sessionType} ·{" "}
              {report.questionsCount}Q
            </Text>
            <View
              style={{
                backgroundColor: scoreColor(report.averageScore) + "20",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: scoreColor(report.averageScore) + "40",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: scoreColor(report.averageScore),
                }}
              >
                {report.averageScore}/100
              </Text>
            </View>
          </View>

          {/* Score ring */}
          <View style={{ alignItems: "center", paddingVertical: 16 }}>
            <ScoreRing
              progress={report.averageScore}
              size={100}
              strokeWidth={8}
              subtitle="Score"
              strokeColor={scoreColor(report.averageScore)}
            />
          </View>
        </View>
      }
      renderItem={({ item, index }: { item: Answer; index: number }) => (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Q{index + 1}
            </Text>
            <View
              style={{
                backgroundColor: scoreColor(item.score),
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                {item.score}/100
              </Text>
            </View>
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: "700",
              fontSize: 14,
              marginBottom: 6,
              lineHeight: 20,
            }}
          >
            {item.question}
          </Text>
          {item.transcript && item.transcript !== "(No answer recorded)" && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                lineHeight: 20,
                marginBottom: 8,
              }}
            >
              {item.transcript}
            </Text>
          )}
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              AI Feedback
            </Text>
            <Text
              style={{ color: colors.accent, fontSize: 13, lineHeight: 20 }}
            >
              {item.overall}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function InterviewHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;

  const { history, loading, fetchHistory, removeInterview } =
    useInterviewHistory();
  const [selectedReport, setSelectedReport] = useState<InterviewReport | null>(
    null,
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleBack = useCallback(() => {
    if (selectedReport) {
      setSelectedReport(null);
    } else {
      navigation.goBack();
    }
  }, [selectedReport, navigation]);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 16 }}
    >
      {/* Single header — owns all navigation for this screen */}
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
          {selectedReport ? "Interview Report" : "Interview History"}
        </Text>
        {!selectedReport && history.length > 0 && (
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {history.length} session{history.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {/* Content */}
      {selectedReport ? (
        <ReportDetail report={selectedReport} bottomInset={bottomInset} />
      ) : loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : history.length === 0 ? (
        // Empty state
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
            paddingBottom: bottomInset + 20,
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
            <Ionicons name="time-outline" size={36} color={colors.textMuted} />
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
            No interviews yet
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
            Complete a mock interview to see your history and track your
            progress over time.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 28,
            }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              Start Interview
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomInset + 24,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <InterviewHistoryCard
              report={item}
              onPress={setSelectedReport}
              onDelete={removeInterview}
            />
          )}
        />
      )}
    </View>
  );
}
