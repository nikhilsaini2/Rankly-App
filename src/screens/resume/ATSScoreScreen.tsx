import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScoreBar } from "../../components/atoms/ScoreBar";
import { ScoreRing } from "../../components/atoms/ScoreRing";
import { useAtsScore } from "../../hooks/useAtsScore";
import { colors } from "../../theme/color";
import type { AtsScoreRow } from "../../types/common.types";
import type {
  RootStackParamList,
  RootTabParamList,
} from "../../types/navigation.types";
import { scoreTierColor, scoreTierLabel } from "../../utils/score";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AtsScoreScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "AtsScore">>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tabNav = navigation.getParent() as
    | NavigationProp<RootTabParamList>
    | undefined;

  const { resumeId, scoreId } = route.params;
  const { getLatestScore, getScoreById } = useAtsScore();

  const [loading, setLoading] = useState(true);
  const [openS, setOpenS] = useState(true);
  const [openI, setOpenI] = useState(true);
  const [data, setData] = useState<AtsScoreRow | null>(null);

  const screenOpacity = useSharedValue(0);
  const screenY = useSharedValue(16);
  const screenAnim = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenY.value }],
  }));

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    screenY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [screenOpacity, screenY]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let row: AtsScoreRow | null = null;
        if (scoreId) {
          row = await getScoreById(scoreId);
        } else {
          row = await getLatestScore(resumeId);
        }
        if (!alive) return;
        setData(row);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [resumeId, scoreId, getLatestScore, getScoreById]);

  function barColor(v: number) {
    if (v >= 75) return colors.accent;
    if (v >= 50) return colors.warning;
    return colors.danger;
  }

  if (loading || !data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={{ color: colors.textSecondary }}>
          {loading ? "Loading report…" : "No score for this resume yet."}
        </Text>
        {loading ? null : (
          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: colors.primary }}>Go back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const overall = data.overallScore;
  const strengths = data.feedback?.strengths ?? [];
  const improvements = data.feedback?.improvements ?? [];
  const kwF = data.keywordsFound ?? [];
  const kwM = data.keywordsMissing ?? [];
  const ctxKw = kwM.length ? kwM.join(", ") : "none listed";

  return (
    <Animated.View style={[{ flex: 1 }, screenAnim]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <ScoreRing
            size={140}
            progress={overall}
            strokeColor={scoreTierColor(overall)}
            displayValue={overall}
            subtitle={scoreTierLabel(overall)}
            animated={false}
          />
          <View style={styles.tierPill}>
            <Text style={styles.tierPillText}>{scoreTierLabel(overall)}</Text>
          </View>
        </View>

        <ScoreBar
          label="Keyword match"
          value={data.keywordScore ?? overall}
          fillColor={barColor(data.keywordScore ?? overall)}
          delayMs={0}
        />
        <ScoreBar
          label="Format"
          value={data.formatScore ?? overall}
          fillColor={barColor(data.formatScore ?? overall)}
          delayMs={100}
        />
        <ScoreBar
          label="Content"
          value={data.contentScore ?? overall}
          fillColor={barColor(data.contentScore ?? overall)}
          delayMs={200}
        />
        <ScoreBar
          label="Readability"
          value={data.readabilityScore ?? overall}
          fillColor={barColor(data.readabilityScore ?? overall)}
          delayMs={300}
        />

        <Text style={styles.section}>✓ Found Keywords</Text>
        <ChipRow items={kwF} tone="ok" />
        <Text style={styles.section}>✗ Missing Keywords</Text>
        <ChipRow items={kwM} tone="bad" />

        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setOpenS(!openS);
          }}
          style={styles.accHead}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={colors.accent}
          />
          <Text style={styles.accTitle}>Strengths</Text>
          <Ionicons
            name={openS ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>
        {openS ? (
          <View style={styles.accBody}>
            {strengths.map((s) => (
              <Text key={s} style={styles.bullet}>
                • {s}
              </Text>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setOpenI(!openI);
          }}
          style={styles.accHead}
        >
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={colors.warning}
          />
          <Text style={styles.accTitle}>Areas to Improve</Text>
          <Ionicons
            name={openI ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>
        {openI ? (
          <View style={styles.accBody}>
            {improvements.map((s) => (
              <Text key={s} style={styles.bullet}>
                • {s}
              </Text>
            ))}
          </View>
        ) : null}

        {data.aiSummary ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>AI Summary</Text>
            <Text style={styles.summaryText}>{data.aiSummary}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() =>
            tabNav?.navigate("AI", {
              atsContext: `My ATS score is ${overall}/100. Missing keywords: ${ctxKw}. Help me improve.`,
              initialSegment: "chat",
            })
          }
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Improve with AI Coach →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

function ChipRow({ items, tone }: { items: string[]; tone: "ok" | "bad" }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {items.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>—</Text>
        ) : (
          items.map((k) => (
            <View
              key={k}
              style={[
                styles.chip,
                tone === "ok" ? styles.chipGreen : styles.chipRed,
              ]}
            >
              <Text
                style={
                  tone === "ok" ? styles.chipTextGreen : styles.chipTextRed
                }
              >
                {k}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  back: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backText: { color: colors.textPrimary, fontSize: 16 },
  hero: { alignItems: "center", marginBottom: 24 },
  tierPill: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierPillText: { color: colors.textPrimary, fontWeight: "700", fontSize: 13 },
  section: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  accHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  accTitle: { flex: 1, color: colors.textPrimary, fontWeight: "700" },
  accBody: { paddingBottom: 12 },
  bullet: {
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  summaryText: { color: colors.textSecondary, lineHeight: 24, fontSize: 15 },
  cta: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: { color: colors.textPrimary, fontWeight: "800", fontSize: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
  },
  chipGreen: { borderColor: colors.accent },
  chipRed: { borderColor: colors.danger },
  chipTextGreen: { color: colors.accent, fontSize: 12 },
  chipTextRed: { color: colors.danger, fontSize: 12 },
});
