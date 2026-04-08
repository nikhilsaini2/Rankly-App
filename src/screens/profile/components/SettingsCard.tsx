import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { colors } from "../../../theme/color";
import { styles } from "../styles";

interface SettingsCardProps {
  notif: boolean;
  onToggleNotif: (value: boolean) => void;
}

export function SettingsCard({ notif, onToggleNotif }: SettingsCardProps) {
  return (
    <Animated.View style={[styles.settingsCard]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          Linking.openURL("https://example.com/privacy").catch(() => {})
        }
      >
        <View style={styles.settingsRow}>
          <View style={[styles.settingsIconBox, styles.settingsIconPrivacy]}>
            <Feather name="shield" size={16} color={colors.accent} />
          </View>
          <Text style={styles.settingsLabel}>Privacy Policy</Text>
          <Feather
            name="chevron-right"
            size={16}
            color={colors.textSecondary}
          />
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
            <Feather name="file-text" size={16} color={colors.textSecondary} />
          </View>
          <Text style={styles.settingsLabel}>Terms of Service</Text>
          <Feather
            name="chevron-right"
            size={16}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
