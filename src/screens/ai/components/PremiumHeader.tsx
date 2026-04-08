import React from "react";
import { Text, View } from "react-native";
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
      </View>
      <Text style={styles.headerSubtitle}>
        <Text style={styles.headerSubtitleSpark}>✦</Text> Powered by Gemini
      </Text>
    </View>
  );
}
