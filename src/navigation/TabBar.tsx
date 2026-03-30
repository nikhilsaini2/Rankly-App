import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TABS } from "../constants/tabs";
import { colors } from "../theme/color";

export const TabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
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
                colors={[colors.primary, colors.primaryDark]}
                style={styles.activeTab}
              >
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={colors.textPrimary}
                  style={styles.glow}
                />
                <Text style={styles.activeText}>{tab.name}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTab}>
                <Ionicons name={tab.icon} size={20} color={colors.textMuted} />
                <Text style={styles.inactiveText}>{tab.name}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.glass,
    marginHorizontal: 10,
    borderRadius: 30,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
    marginLeft: 6,
    fontSize: 12,
  },
  inactiveText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  glow: {
    shadowColor: colors.glow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
