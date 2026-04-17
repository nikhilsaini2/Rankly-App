import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createInterviewStyles } from "../Interview.styles";

interface QuestionHeaderProps {
  question: string;
  index: number;
  total: number;
  sessionType: string;
  difficulty: string;
  isSpeaking: boolean;
  onSpeakerPress: () => void;
  progress: number;
}

function QuestionHeaderComponent({
  question,
  index,
  total,
  sessionType,
  difficulty,
  isSpeaking,
  onSpeakerPress,
  progress,
}: QuestionHeaderProps) {
  const theme = useAppTheme();
  const s = createInterviewStyles(theme);

  const { diffBg, diffBorder } = useMemo(() => {
    const bg =
      difficulty === "easy"
        ? "rgba(0,212,170,0.15)"
        : difficulty === "medium"
          ? "rgba(255,179,71,0.15)"
          : "rgba(255,92,92,0.15)";
    const border =
      difficulty === "easy"
        ? theme.accent
        : difficulty === "medium"
          ? theme.warning
          : theme.danger;
    return { diffBg: bg, diffBorder: border };
  }, [difficulty, theme]);

  const typeLabel = sessionType.charAt(0).toUpperCase() + sessionType.slice(1);
  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const progressWidth = total > 0 ? (index / total) * 100 : 0;

  return (
    <>
      <View style={s.progressHeader}>
        <Text style={s.progressText}>
          Question {index + 1} of {total}
        </Text>
      </View>

      <View style={s.progressTrack}>
        {progressWidth > 0 && (
          <LinearGradient
            colors={[theme.secondary, theme.primary]}
            style={[s.progressFill, { width: `${progressWidth}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
      </View>

      <View style={s.questionCard}>
        <LinearGradient
          colors={[theme.secondary, theme.primary]}
          style={s.questionAccentBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <View style={s.questionHeaderRow}>
          <View style={s.questionBadge}>
            <Text style={s.questionBadgeText}>Q{index + 1}</Text>
          </View>

          <TouchableOpacity
            onPress={onSpeakerPress}
            activeOpacity={0.7}
            style={[s.speakerBtn, isSpeaking && s.speakerBtnActive]}
          >
            <Ionicons
              name={isSpeaking ? "volume-high" : "volume-medium-outline"}
              size={18}
              color={isSpeaking ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={s.questionText}>{question}</Text>

        <View style={s.metaRow}>
          <View style={s.metaChipPrimary}>
            <Text style={s.metaChipTextPrimary}>{typeLabel}</Text>
          </View>
          <View style={[s.metaChip, { backgroundColor: diffBg, borderColor: diffBorder }]}>
            <Text style={[s.metaChipText, { color: diffBorder }]}>{diffLabel}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

export const QuestionHeader = memo(QuestionHeaderComponent);
