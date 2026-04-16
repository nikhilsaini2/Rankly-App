import React from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { colors } from "../../../theme/color";
import { scoreTierColor } from "../../../utils/score";
import { styles } from "../styles";

interface StatsStripProps {
  statsDisplay: {
    resumes: number;
    bestAts: number;
    interviews: number;
  };
}

export function StatsStrip({ statsDisplay }: StatsStripProps) {
  const atsColor = statsDisplay.bestAts > 0
    ? scoreTierColor(statsDisplay.bestAts)
    : colors.textSecondary;

  return (
    <Animated.View style={[styles.statsStrip]}>
      <View style={styles.statCell}>
        <Text
          style={[
            styles.statValue,
            statsDisplay.resumes === 0 && styles.statValueMuted,
          ]}
        >
          {statsDisplay.resumes === 0 ? "—" : String(statsDisplay.resumes)}
        </Text>
        <Text style={styles.statLabel}>Resumes</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCell}>
        <Text
          style={[
            styles.statValue,
            statsDisplay.bestAts === 0 && styles.statValueMuted,
            statsDisplay.bestAts > 0 && { color: atsColor },
          ]}
        >
          {statsDisplay.bestAts === 0 ? "—" : String(statsDisplay.bestAts)}
        </Text>
        <Text style={styles.statLabel}>Best ATS</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCell}>
        <Text
          style={[
            styles.statValue,
            statsDisplay.interviews === 0 && styles.statValueMuted,
          ]}
        >
          {statsDisplay.interviews === 0
            ? "—"
            : String(statsDisplay.interviews)}
        </Text>
        <Text style={styles.statLabel}>Interviews</Text>
      </View>
    </Animated.View>
  );
}
