import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function FeatureRow({
  iconName,
  iconColor,
  iconBg,
  title,
  subtitle,
}: {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={featureRowStyles.row}>
      <View style={[featureRowStyles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={featureRowStyles.title}>{title}</Text>
        <Text style={featureRowStyles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const featureRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#111122",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D0D0F0",
  },
  subtitle: {
    fontSize: 11,
    color: "#505080",
    marginTop: 1,
  },
});
