import { Feather, Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "../../hooks";
import { useProfileStats } from "../../hooks/useProfileStats";
import {
  PLAN_FEATURE_MATRIX,
  PLAN_LABELS,
  getPlanUsageSummary,
} from "../../services/premium/premiumService";
import { getElevation } from "../../theme";
import { useAppTheme } from "../../theme/useAppTheme";
import type { RootStackParamList } from "../../types/navigation.types";

const SYNC_ROWS = [
  {
    id: "interviews",
    title: "Interview history",
    subtitle: "Cloud-backed with local fallback",
    icon: "mic" as const,
    tint: "#F59E0B",
  },
  {
    id: "salary",
    title: "Salary coaching history",
    subtitle: "Saved to your account",
    icon: "briefcase" as const,
    tint: "#10B981",
  },
  {
    id: "resume",
    title: "Resume history",
    subtitle: "Cloud builds plus device-generated exports",
    icon: "file-text" as const,
    tint: "#8B5CF6",
  },
];

export default function PremiumScreen() {
  const theme = useAppTheme();
  const elevation = getElevation(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, loading } = useProfile();
  const { stats } = useProfileStats(user?.id);

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: theme.textSecondary, textAlign: "center" }}>
          {loading ? "Loading plan details..." : "Could not load plan details."}
        </Text>
      </View>
    );
  }

  const usage = getPlanUsageSummary({
    user,
    resumesUsed: stats.resumes,
    interviewsCompleted: stats.interviews,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 4, marginRight: 10 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: 22,
                fontWeight: "800",
              }}
            >
              Plan & Usage
            </Text>
            <Text
              style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}
            >
              Premium foundation for your Rankly account
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={[
            "rgba(139,92,246,0.24)",
            "rgba(16,185,129,0.12)",
            theme.surface,
          ]}
          style={{
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                Current Plan
              </Text>
              <Text
                style={{
                  color: theme.textPrimary,
                  fontSize: 28,
                  fontWeight: "800",
                  marginTop: 4,
                }}
              >
                {PLAN_LABELS[user.plan]}
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 18,
                backgroundColor: "rgba(16,185,129,0.15)",
                borderWidth: 1,
                borderColor: "rgba(16,185,129,0.3)",
              }}
            >
              <Text
                style={{ color: theme.accent, fontWeight: "700", fontSize: 12 }}
              >
                {usage.credits} credits
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: theme.textSecondary,
              fontSize: 14,
              lineHeight: 21,
              marginBottom: 18,
            }}
          >
            Your plan now drives resume limits through a shared entitlement
            layer, while synced history keeps your coaching progress tied to
            your account.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (user.plan === "pro") {
                Alert.alert(
                  "Already on Pro",
                  "Your account is already marked as Pro in Rankly.",
                );
                return;
              }

              Alert.alert(
                "Billing Setup Next",
                "The in-app plan surface is ready. Store billing still needs to be connected before upgrades can happen inside the app.",
              );
            }}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
              ...elevation.action,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                fontSize: 15,
              }}
            >
              {user.plan === "pro" ? "You are on Pro" : "Upgrade Path Ready"}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 18,
            marginBottom: 16,
            ...elevation.card,
          }}
        >
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 14,
            }}
          >
            Usage Snapshot
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <UsageCell
              theme={theme}
              label="Resumes"
              value={`${usage.resumesUsed}${usage.resumesLimit ? `/${usage.resumesLimit}` : ""}`}
              subtitle={usage.resumesRemainingLabel}
            />
            <UsageCell
              theme={theme}
              label="Interviews"
              value={String(usage.interviewsCompleted)}
              subtitle="Completed"
            />
            <UsageCell
              theme={theme}
              label="Best ATS"
              value={stats.bestAts > 0 ? String(stats.bestAts) : "—"}
              subtitle="Top score"
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 18,
            marginBottom: 16,
            ...elevation.card,
          }}
        >
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 14,
            }}
          >
            Sync Status
          </Text>

          {SYNC_ROWS.map((row, index) => (
            <View
              key={row.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.border,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: row.tint + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={row.icon} size={16} color={row.tint} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {row.title}
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {row.subtitle}
                </Text>
              </View>
              <Text
                style={{ color: theme.accent, fontSize: 12, fontWeight: "700" }}
              >
                Active
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 18,
            ...elevation.card,
          }}
        >
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 14,
            }}
          >
            Plan Comparison
          </Text>

          {PLAN_FEATURE_MATRIX.map((feature, index) => (
            <View
              key={feature.id}
              style={{
                paddingTop: index === 0 ? 0 : 14,
                marginTop: index === 0 ? 0 : 14,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.textPrimary,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {feature.label}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <ComparisonPill
                  theme={theme}
                  label="Free"
                  value={feature.free}
                />
                <ComparisonPill
                  theme={theme}
                  label="Pro"
                  value={feature.pro}
                  highlight
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function UsageCell({
  theme,
  label,
  value,
  subtitle,
}: {
  theme: ReturnType<typeof useAppTheme>;
  label: string;
  value: string;
  subtitle: string;
}) {
  const elevation = getElevation(theme);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surfaceAlt,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
        ...elevation.subtle,
      }}
    >
      <Text
        style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "700" }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.textPrimary,
          fontSize: 24,
          fontWeight: "800",
          marginTop: 8,
        }}
      >
        {value}
      </Text>
      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 6 }}>
        {subtitle}
      </Text>
    </View>
  );
}

function ComparisonPill({
  theme,
  label,
  value,
  highlight = false,
}: {
  theme: ReturnType<typeof useAppTheme>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        borderWidth: highlight ? 1.5 : 1,
        borderColor: highlight ? theme.primary : theme.border,
        backgroundColor: highlight ? theme.surface : theme.surfaceAlt,
        padding: 12,
      }}
    >
      <Text
        style={{
          color: highlight ? theme.primary : theme.textMuted,
          fontSize: 11,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 1.1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.textPrimary,
          fontSize: 13,
          fontWeight: "600",
          marginTop: 6,
          lineHeight: 18,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
