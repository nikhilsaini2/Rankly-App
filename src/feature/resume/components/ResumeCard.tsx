import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { getResumePublicUrl } from "../../../services/resume/resumeService";
import { colors } from "../../../theme/color";
import type { ResumeRow } from "../../../types/common.types";
import { AtsScoreSummary } from "../../../types/common.types";
import type { RootStackParamList } from "../../../types/navigation.types";
import { formatResumeDate, truncateFilename } from "../../../utils/format";
import { scoreTierColor } from "../../../utils/score";
import { cardStyles } from "./ResumeCard.styles";

type Props = {
  item: ResumeRow;
  latestScore: AtsScoreSummary | null;
  scoring: boolean;
  index: number;
  rootNav: NavigationProp<RootStackParamList> | undefined;
  onAnalyze: (id: string) => void;
  onDelete: (item: ResumeRow) => void;
};

export function ResumeCard({
  item,
  latestScore,
  scoring,
  index,
  rootNav,
  onAnalyze,
  onDelete,
}: Props) {
  const fname = item.fileName ?? item.title;
  const score = latestScore?.overall_score ?? null;
  const scoreColor = score !== null ? scoreTierColor(score) : colors.textMuted;

  // Determine if this resume came from builder or from upload
  const isBuilderResume = !item.fileUrl;

  const anim = useSharedValue(0);
  useEffect(() => {
    anim.value = withDelay(
      index * 60,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: (1 - anim.value) * 14 }],
  }));

  const handleViewResume = async () => {
    try {
      const publicUrl = await getResumePublicUrl(item);
      if (!publicUrl) {
        console.error("Failed to get resume URL");
        // Could show a toast or alert here
        return;
      }

      rootNav?.navigate("PdfViewer", {
        url: publicUrl,
        fileName: item.fileName ?? item.title ?? "Resume.pdf",
      });
    } catch (error) {
      console.error("Failed to view resume:", error);
      // Could show a toast or alert here
    }
  };

  return (
    <Reanimated.View style={animStyle}>
      <View style={cardStyles.card}>
        <View style={cardStyles.leftCol}>
          <LinearGradient
            colors={[colors.danger, colors.danger]}
            style={cardStyles.pdfIconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={colors.textPrimary}
            />
            <Text style={cardStyles.pdfLabel}>{"PDF"}</Text>
          </LinearGradient>
        </View>

        <View style={cardStyles.content}>
          <Text style={cardStyles.title} numberOfLines={1}>
            {truncateFilename(fname)}
          </Text>

          <View style={cardStyles.metaRow}>
            <Ionicons
              name="time-outline"
              size={11}
              color={colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={cardStyles.metaText}>
              {formatResumeDate(item.createdAt)}
            </Text>
            {item.status && (
              <>
                <View style={cardStyles.metaDot} />
                <View
                  style={[
                    cardStyles.statusPill,
                    item.status === "analyzed"
                      ? {
                          backgroundColor: colors.success + "20",
                          borderColor: colors.success + "40",
                        }
                      : {
                          backgroundColor: colors.warning + "20",
                          borderColor: colors.warning + "40",
                        },
                  ]}
                >
                  <Text
                    style={[
                      cardStyles.statusText,
                      item.status === "analyzed"
                        ? { color: colors.success }
                        : { color: colors.warning },
                    ]}
                  >
                    {item.status === "analyzed" ? "Analyzed" : "Uploaded"}
                  </Text>
                </View>
              </>
            )}
            {score !== null && (
              <>
                <View style={cardStyles.metaDot} />
                <View
                  style={[
                    cardStyles.scorePill,
                    { borderColor: scoreColor + "55" },
                  ]}
                >
                  <View
                    style={[
                      cardStyles.scorePillDot,
                      { backgroundColor: scoreColor },
                    ]}
                  />
                  <Text
                    style={[cardStyles.scorePillText, { color: scoreColor }]}
                  >
                    ATS {score}
                  </Text>
                </View>
              </>
            )}
            {score === null && (
              <>
                <View style={cardStyles.metaDot} />
                <View style={cardStyles.unscored}>
                  <Text style={cardStyles.unscoredText}>Not scored</Text>
                </View>
              </>
            )}
          </View>

          <View style={cardStyles.actions}>
            {!isBuilderResume && (
              <PressableScale
                style={cardStyles.primaryBtn}
                onPress={() => onAnalyze(item.id)}
                disabled={scoring}
              >
                <LinearGradient
                  colors={
                    scoring
                      ? [colors.surfaceAlt, colors.surfaceAlt]
                      : ["rgba(108,99,255,0.22)", "rgba(108,99,255,0.12)"]
                  }
                  style={cardStyles.primaryBtnInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons
                    name="flash-outline"
                    size={13}
                    color={scoring ? colors.textMuted : colors.primary}
                  />
                  <Text
                    style={[
                      cardStyles.primaryBtnText,
                      scoring && { color: colors.textMuted },
                    ]}
                  >
                    {score !== null ? "Re-analyze" : "Get ATS Score"}
                  </Text>
                </LinearGradient>
              </PressableScale>
            )}

            {score !== null && (
              <PressableScale
                style={cardStyles.secondaryBtn}
                onPress={() =>
                  rootNav?.navigate("AtsScore", {
                    resumeId: item.id,
                    scoreId: latestScore!.id,
                  })
                }
              >
                <Ionicons
                  name="bar-chart-outline"
                  size={13}
                  color={colors.accent}
                />
                <Text style={cardStyles.secondaryBtnText}>View Report</Text>
              </PressableScale>
            )}

            <TouchableOpacity
              style={cardStyles.deleteBtn}
              onPress={() => onDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Reanimated.View>
  );
}
