import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TABS } from "../constants/tabs";
import { useAppTheme } from "../theme/useAppTheme";

export const TabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const currentRoute = state.routes[state.index].name;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { marginBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        const isFocused = currentRoute === tab.name;

        const onPress = () => {
          if (currentRoute === tab.name) return;
          if (!isFocused) navigation.navigate(tab.name as never);
        };

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            disabled={isFocused}
            style={styles.tab}
            activeOpacity={0.8}
          >
            {isFocused ? (
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                style={styles.activeTab}
              >
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={theme.textPrimary}
                  style={styles.glow}
                />
                <Text style={styles.activeText}>{tab.name}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTab}>
                <Ionicons name={tab.icon} size={20} color={theme.textMuted} />
                <Text style={styles.inactiveText}>{tab.name}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      marginHorizontal: 10,
      borderRadius: 30,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tab: {
      flex: 1,
      alignItems: "center",
    },
    activeTab: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
    },
    inactiveTab: {
      alignItems: "center",
    },
    activeText: {
      color: theme.textPrimary,
      marginLeft: 6,
      fontSize: 12,
    },
    inactiveText: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: "500",
      marginTop: 2,
    },
    glow: {
      shadowColor: theme.glow,
      shadowOpacity: 1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
    },
  });
}
