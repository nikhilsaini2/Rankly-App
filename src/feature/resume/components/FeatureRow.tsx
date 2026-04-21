import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { getElevation } from "../../../theme";
import { useAppTheme } from "../../../theme/useAppTheme";

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
  const theme = useAppTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => {
  const elevation = getElevation(theme);

  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      ...elevation.subtle,
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
      color: theme.textPrimary,
    },
    subtitle: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
  });
};
