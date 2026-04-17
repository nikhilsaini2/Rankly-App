import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "../../../theme/useAppTheme";
import { scoreTierColor } from "../../../utils/score";
import { createInterviewStyles } from "../Interview.styles";
import type { Answer } from "../types/interview.types";

interface FeedbackCardProps {
  answer: Answer;
}

function FeedbackCardComponent({ answer }: FeedbackCardProps) {
  const theme = useAppTheme();
  const s = createInterviewStyles(theme);
  const scoreColor = useMemo(() => scoreTierColor(answer.score), [answer.score]);

  return (
    <View style={s.feedbackContainer}>
      <View style={s.feedbackCard}>
        <View style={s.feedbackHeaderRow}>
          <Text style={s.feedbackTitle}>AI Feedback</Text>
          <View style={[s.scoreBadge, { backgroundColor: scoreColor }]}>
            <Text style={s.scoreBadgeText}>{answer.score}/100</Text>
          </View>
        </View>

        <Text style={s.feedbackOverall}>{answer.overall}</Text>

        {answer.strengths.length > 0 && (
          <View style={s.feedbackSection}>
            <Text style={s.feedbackSectionLabel}>Strengths</Text>
            {answer.strengths.map((item, i) => (
              <Text key={i} style={s.feedbackItem}>✓ {item}</Text>
            ))}
          </View>
        )}

        {answer.improvements.length > 0 && (
          <View style={s.feedbackSection}>
            <Text style={s.feedbackSectionLabel}>Improvements</Text>
            {answer.improvements.map((item, i) => (
              <Text key={i} style={s.feedbackItem}>→ {item}</Text>
            ))}
          </View>
        )}

        {answer.tip && (
          <View style={s.feedbackTipBox}>
            <Ionicons name="bulb-outline" size={16} color={theme.primary} />
            <Text style={s.feedbackTipText}>{answer.tip}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export const FeedbackCard = memo(FeedbackCardComponent);
