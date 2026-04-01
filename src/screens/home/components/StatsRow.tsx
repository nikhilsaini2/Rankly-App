import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import React from "react";
import { Text, View } from "react-native";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { Skeleton } from "../../../components/atoms/Skeleton";
import { colors } from "../../../theme/color";
import type {
  RootStackParamList,
  RootTabParamList,
} from "../../../types/navigation.types";
import { scoreTierColor } from "../../../utils/score";
import { styles } from "../styles";

interface StatsRowProps {
  loading: boolean;
  highestScore: any;
  resumeCount: number;
  sessionCount: number;
  navigation: NavigationProp<RootTabParamList>;
  rootNav: NavigationProp<RootStackParamList> | undefined;
}

export function StatsRow({
  loading,
  highestScore,
  resumeCount,
  sessionCount,
  navigation,
  rootNav,
}: StatsRowProps) {
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
      <PressableScale
        style={styles.statPress}
        onPress={() =>
          navigation.navigate("AI", { initialSegment: "interview" })
        }
      >
        <View style={styles.statCard}>
          <Ionicons name="mic-outline" size={18} color={colors.primaryLight} />
          <Text style={styles.statVal}>{`${sessionCount}`}</Text>
          <Text style={styles.statLab}>Sessions</Text>
        </View>
      </PressableScale>
    </View>
  );
}
