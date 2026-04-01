import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../../theme/color";
import { styles } from "../styles";
import { StatusPulseDot } from "./StatusPulseDot";

export function PremiumHeader() {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerTitleRow}>
          <StatusPulseDot />
          <Text style={styles.headerTitle}>AI Coach</Text>
        </View>
        <TouchableOpacity style={styles.historyBtn} accessibilityRole="button">
          <Ionicons
            name="time-outline"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSubtitle}>
        <Text style={styles.headerSubtitleSpark}>✦</Text> Powered by Gemini
      </Text>
    </View>
  );
}
