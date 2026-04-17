import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { ScoreRing } from "../../../components/atoms/ScoreRing";
import { Skeleton } from "../../../components/atoms/Skeleton";
import { useAppTheme } from "../../../theme/useAppTheme";
import { LatestScoreCardProps } from "../../../types";
import { scoreTierColor, scoreTierLabel } from "../../../utils/score";
import { createHomeStyles } from "../styles";

export function LatestScoreCard({
  loading,
  latestScore,
  rootNav,
}: LatestScoreCardProps) {
  const theme = useAppTheme();
  const styles = createHomeStyles(theme);
  const navigation = useNavigation<any>();

  if (loading) {
    return <Skeleton style={styles.scoreCardSk} />;
  }

  if (!latestScore || !latestScore.resume_id) {
    return (
      <View style={styles.emptyScoreCard}>
        <Ionicons name="analytics-outline" size={40} color={theme.textMuted} />
        <Text style={styles.emptyScoreTitle}>No ATS score yet</Text>
        <Text style={styles.emptyScoreSub}>
          Upload your resume to get your ATS score
        </Text>
        <PressableScale onPress={() => navigation.navigate("Resume")}>
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
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
            colors={[theme.primary, theme.primaryDark]}
            style={styles.reportBtn}
          >
            <Text style={styles.reportBtnText}>View Full Report</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}
