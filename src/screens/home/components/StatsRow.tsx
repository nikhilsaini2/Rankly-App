import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback } from "react";
import { Text, View } from "react-native";
import { PressableScale } from "../../../components/atoms/PressableScale";
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
  navigation,
  rootNav,
  onRefresh, // <-- add this to StatsRowProps: onRefresh: () => void
}: StatsRowProps & { onRefresh: () => void }) {
  // Re-fetch stats every time this screen comes into focus
  // (e.g. after user adds a resume or completes an AI session)
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
      <PressableScale
        style={styles.statPress}
        onPress={() => {
          if (highestScore?.id) {
            rootNav?.navigate("AtsScore", {
              resumeId: highestScore.resume_id,
              scoreId: highestScore.id,
            });
          } else {
            navigation.navigate("Resume");
          }
        }}
      >
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
      </PressableScale>

      <PressableScale
        style={styles.statPress}
        onPress={() => navigation.navigate("Resume")}
      >
        <View style={styles.statCard}>
          <Ionicons
            name="document-text-outline"
            size={18}
            color={colors.primaryLight}
          />
          <Text style={styles.statVal}>{`${resumeCount}`}</Text>
          <Text style={styles.statLab}>Resumes</Text>
        </View>
      </PressableScale>

      <PressableScale style={styles.statPress} onPress={() => {}}>
        <View style={styles.statCard}>
          <Ionicons name="mic-outline" size={18} color={colors.primaryLight} />
          <Text style={styles.statVal}>{`${sessionCount}`}</Text>
          <Text style={styles.statLab}>Sessions</Text>
        </View>
      </PressableScale>
    </View>
  );
}
