import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { ScoreRing } from "../../../components/atoms/ScoreRing";
import { Skeleton } from "../../../components/atoms/Skeleton";
import { colors } from "../../../theme/color";
import { LatestScoreCardProps } from "../../../types";
import { scoreTierColor, scoreTierLabel } from "../../../utils/score";
import { styles } from "../styles";

export function LatestScoreCard({
  loading,
  latestScore,
  rootNav,
}: LatestScoreCardProps) {
  if (loading) {
    return <Skeleton style={styles.scoreCardSk} />;
  }

  if (!latestScore || !latestScore.resume_id) {
    return (
      <View style={styles.emptyScoreCard}>
        <Ionicons name="analytics-outline" size={40} color={colors.textMuted} />
        <Text style={styles.emptyScoreTitle}>No ATS score yet</Text>
        <Text style={styles.emptyScoreSub}>
          Upload your resume to get your ATS score
        </Text>
        <PressableScale onPress={() => {}}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.getStartedBtn}
          >
            <Text style={styles.getStartedTxt}>Get started</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.atsCard}>
      <View style={styles.ringWrap}>
        <ScoreRing
          size={120}
          progress={latestScore.overall_score}
          strokeColor={scoreTierColor(latestScore.overall_score)}
          displayValue={latestScore.overall_score}
          subtitle={scoreTierLabel(latestScore.overall_score)}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.atsTitle}>Latest ATS check</Text>
        <View style={styles.tierPillWide}>
          <Text style={styles.tierPillTxt}>
            {scoreTierLabel(latestScore.overall_score)}
          </Text>
        </View>
        <PressableScale
          onPress={() =>
            rootNav?.navigate("AtsScore", {
              resumeId: latestScore.resume_id!,
              scoreId: latestScore.id,
            })
          }
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.reportBtn}
          >
            <Text style={styles.reportBtnText}>View Full Report</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}
