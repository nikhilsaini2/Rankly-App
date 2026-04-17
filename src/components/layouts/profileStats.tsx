import React from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";

function StatItem({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{ color: theme.textPrimary, fontSize: 18, fontWeight: "700" }}
      >
        {value}
      </Text>
      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export default function ProfileStats({
  resumeCount,
  bestAts,
  interviewsDone,
}: {
  resumeCount: number;
  bestAts: number;
  interviewsDone: number;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 25,
        paddingVertical: 16,
        borderRadius: 20,
        backgroundColor: theme.glass,
      }}
    >
      <StatItem label="Resumes" value={`${resumeCount}`} />
      <StatItem label="Best ATS" value={bestAts > 0 ? `${bestAts}` : "—"} />
      <StatItem label="Interviews" value={`${interviewsDone}`} />
    </View>
  );
}
