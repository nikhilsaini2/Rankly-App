import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback } from "react";
import { Text, View } from "react-native";
import { Skeleton } from "../../../components/atoms/Skeleton";
import { colors } from "../../../theme/color";
import { StatsRowProps } from "../../../types";
import { scoreTierColor } from "../../../utils/score";
import { styles } from "../styles";

export function StatsRow({
  loading,
  highestScore,
  resumeCount,
  sessionCount,
  onRefresh,
}: StatsRowProps & { onRefresh: () => void }) {
  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh]),
  );

  if (loading) {
    return (
      <View style={styles.statsRow}>
        <Skeleton style={styles.statSk} />
        <Skeleton style={styles.statSk} />
        <Skeleton style={styles.statSk} />
      </View>
    );
  }

  return (
    <View style={styles.statsRow}>
      <View style={styles.statPress}>
        <View style={styles.statCard}>
          <Ionicons
            name="speedometer-outline"
            size={18}
            color={colors.primaryLight}
          />
          <Text
            style={[
              styles.statVal,
              highestScore
                ? { color: scoreTierColor(highestScore.overall_score) }
                : null,
            ]}
          >
            {highestScore ? `${highestScore.overall_score}` : "—"}
          </Text>
          <Text style={styles.statLab}>Best ATS</Text>
        </View>
      </View>

      <View style={styles.statPress}>
        <View style={styles.statCard}>
          <Ionicons
            name="document-text-outline"
            size={18}
            color={colors.primaryLight}
          />
          <Text style={styles.statVal}>{`${resumeCount}`}</Text>
          <Text style={styles.statLab}>Resumes</Text>
        </View>
      </View>

      <View style={styles.statPress}>
        <View style={styles.statCard}>
          <Ionicons name="mic-outline" size={18} color={colors.primaryLight} />
          <Text style={styles.statVal}>{`${sessionCount}`}</Text>
          <Text style={styles.statLab}>Sessions</Text>
        </View>
      </View>
    </View>
  );
}
