import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { colors } from "../../../theme/color";
import type { ResumeRow } from "../../../types/common.types";
import { AtsScoreSummary } from "../../../types/common.types";
import type { RootStackParamList } from "../../../types/navigation.types";
import { formatResumeDate, truncateFilename } from "../../../utils/format";
import { styles } from "../styles";

type Props = {
  item: ResumeRow;
  latestScore: AtsScoreSummary | null;
  scoring: boolean;
  rootNav: NavigationProp<RootStackParamList> | undefined;
  onAnalyze: (id: string) => void;
  onDelete: (item: ResumeRow) => void;
};

export function ResumeCard({
  item,
  latestScore,
  scoring,
  rootNav,
  onAnalyze,
  onDelete,
}: Props) {
  const fname = item.fileName ?? item.title;

  return (
    <View style={styles.card}>
      <View style={styles.pdfIcon}>
        <Text style={styles.pdfTxt}>PDF</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {truncateFilename(fname)}
        </Text>
        <Text style={styles.cardMeta}>{formatResumeDate(item.createdAt)}</Text>
        <View
          style={[
            styles.scorePill,
            latestScore ? styles.scorePillOn : styles.scorePillOff,
          ]}
        >
          <Text
            style={[
              styles.scorePillTxt,
              !latestScore && { color: colors.textMuted },
            ]}
          >
            {latestScore ? `ATS ${latestScore.overall_score}` : "Not Scored"}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <PressableScale
            style={styles.outlineBtn}
            onPress={() => onAnalyze(item.id)}
            disabled={scoring}
          >
            <Text style={styles.outlineBtnTxt}>Get ATS Score</Text>
          </PressableScale>
          {latestScore && (
            <PressableScale
              style={styles.outlineBtn}
              onPress={() =>
                rootNav?.navigate("AtsScore", {
                  resumeId: item.id,
                  scoreId: latestScore.id,
                })
              }
            >
              <Text style={styles.outlineBtnTxt}>View Report</Text>
            </PressableScale>
          )}
          <TouchableOpacity onPress={() => onDelete(item)}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
