import React from "react";
import { Text, View } from "react-native";
import { colors } from "../../theme/color";

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700" }}
      >
        {value}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
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
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 25,
        paddingVertical: 16,
        borderRadius: 20,
        backgroundColor: colors.glass,
      }}
    >
      <StatItem label="Resumes" value={`${resumeCount}`} />
      <StatItem label="Best ATS" value={bestAts > 0 ? `${bestAts}` : "—"} />
      <StatItem label="Interviews" value={`${interviewsDone}`} />
    </View>
  );
}
