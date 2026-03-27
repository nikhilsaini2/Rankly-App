import React from "react";
import { Text, View } from "react-native";
import { colors } from "../../theme/color";

const StatItem = ({ label, value }: any) => (
  <View style={{ alignItems: "center" }}>
    <Text
      style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700" }}
    >
      {value}
    </Text>
    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
  </View>
);

const ProfileStats = () => {
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
      <StatItem label="Rank" value="—" />
      <StatItem label="Score" value="—" />
      <StatItem label="Streak" value="—" />
    </View>
  );
};

export default React.memo(ProfileStats);
