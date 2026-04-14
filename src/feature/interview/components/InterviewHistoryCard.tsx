import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/color';
import type { InterviewReport } from '../services/interviewStorage';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.accent;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

function difficultyColor(d: string): string {
  if (d === 'easy') return colors.accent;
  if (d === 'medium') return colors.warning;
  return colors.danger;
}

interface Props {
  report: InterviewReport;
  onPress: (report: InterviewReport) => void;
  onDelete: (id: string) => void;
}

export const InterviewHistoryCard = memo(({ report, onPress, onDelete }: Props) => {
  const handleDelete = () => {
    Alert.alert(
      'Delete Interview',
      'Remove this interview from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(report.id),
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(report)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Score circle */}
      <View style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: scoreColor(report.averageScore) + '18',
        borderWidth: 2,
        borderColor: scoreColor(report.averageScore) + '50',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '800',
          color: scoreColor(report.averageScore),
        }}>
          {report.averageScore}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}
          numberOfLines={1}
        >
          {report.role}
        </Text>

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {/* Difficulty badge */}
          <View style={{
            backgroundColor: difficultyColor(report.difficulty) + '18',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: difficultyColor(report.difficulty) + '40',
          }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: difficultyColor(report.difficulty),
              textTransform: 'capitalize',
            }}>
              {report.difficulty}
            </Text>
          </View>

          {/* Session type badge */}
          <View style={{
            backgroundColor: colors.primary + '15',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: colors.primary + '30',
          }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: colors.primary,
              textTransform: 'capitalize',
            }}>
              {report.sessionType}
            </Text>
          </View>

          {/* Questions count */}
          <Text style={{ fontSize: 11, color: colors.textMuted, alignSelf: 'center' }}>
            {report.questionsCount}Q
          </Text>
        </View>

        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          {relativeTime(report.createdAt)}
        </Text>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 6 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
});
