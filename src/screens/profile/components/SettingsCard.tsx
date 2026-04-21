import { Feather, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createProfileStyles } from "../styles";

interface SettingsCardProps {
  notif: boolean;
  onToggleNotif: (value: boolean) => void;
  onInterviewHistoryPress: () => void;
  onResumeHistoryPress: () => void;
  onManagePlanPress: () => void;
  onThemeToggle: () => void;
}

export function SettingsCard({
  notif,
  onToggleNotif,
  onInterviewHistoryPress,
  onResumeHistoryPress,
  onManagePlanPress,
  onThemeToggle,
}: SettingsCardProps) {
  const theme = useAppTheme();
  const styles = createProfileStyles(theme);
  const mode = useSelector((state: RootState) => state.theme.mode);
  const isLight = mode === "light";

  return (
    <Animated.View style={[styles.settingsCard]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onResumeHistoryPress}>
        <View style={styles.settingsRow}>
          <View
            style={[
              styles.settingsIconBox,
              { backgroundColor: "rgba(16,185,129,0.12)" },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={theme.accent}
            />
          </View>
          <Text style={styles.settingsLabel}>Resume History</Text>
          <Feather name="chevron-right" size={16} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>

      <View style={styles.settingsDivider} />

      <TouchableOpacity activeOpacity={0.9} onPress={onManagePlanPress}>
        <View style={styles.settingsRow}>
          <View
            style={[
              styles.settingsIconBox,
              { backgroundColor: "rgba(245,158,11,0.14)" },
            ]}
          >
            <Feather name="star" size={16} color="#F59E0B" />
          </View>
          <Text style={styles.settingsLabel}>Plan & Usage</Text>
          <Feather name="chevron-right" size={16} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>

      <View style={styles.settingsDivider} />

      <TouchableOpacity activeOpacity={0.9} onPress={onInterviewHistoryPress}>
        <View style={styles.settingsRow}>
          <View
            style={[
              styles.settingsIconBox,
              { backgroundColor: "rgba(139,92,246,0.12)" },
            ]}
          >
            <Ionicons name="time-outline" size={16} color={theme.primary} />
          </View>
          <Text style={styles.settingsLabel}>Interview History</Text>
          <Feather name="chevron-right" size={16} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>

      <View style={styles.settingsDivider} />

      {/* Light Mode toggle — off = dark (default), on = light */}
      <TouchableOpacity activeOpacity={0.85} onPress={onThemeToggle}>
        <View style={styles.settingsRow}>
          <View
            style={[
              styles.settingsIconBox,
              { backgroundColor: "rgba(251,191,36,0.12)" },
            ]}
          >
            <Ionicons name="sunny-outline" size={16} color="#F59E0B" />
          </View>
          <Text style={styles.settingsLabel}>Light Mode</Text>
          <Switch
            value={isLight}
            onValueChange={onThemeToggle}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={isLight ? "#FFFFFF" : "#F4F4F5"}
            ios_backgroundColor={theme.border}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.settingsDivider} />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          Linking.openURL("https://example.com/privacy").catch(() => {})
        }
      >
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIconBox, styles.settingsIconPrivacy]}>
            <Feather name="shield" size={16} color={theme.accent} />
          </View>
          <Text style={styles.settingsLabel}>Privacy Policy</Text>
          <Feather name="chevron-right" size={16} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>

      <View style={styles.settingsDivider} />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          Linking.openURL("https://example.com/terms").catch(() => {})
        }
      >
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIconBox, styles.settingsIconTerms]}>
            <Feather name="file-text" size={16} color={theme.textSecondary} />
          </View>
          <Text style={styles.settingsLabel}>Terms of Service</Text>
          <Feather name="chevron-right" size={16} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
