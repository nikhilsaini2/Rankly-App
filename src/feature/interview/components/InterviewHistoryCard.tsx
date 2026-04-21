import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../../theme/useAppTheme';
import { scoreTierColor } from '../../../utils/score';
import type { InterviewHistoryEntry } from '../types/interview.types';

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

interface Props {
  report: InterviewHistoryEntry;
  onPress: (report: InterviewHistoryEntry) => void;
  onDelete: (report: InterviewHistoryEntry) => void;
}

export const InterviewHistoryCard = memo(({ report, onPress, onDelete }: Props) => {
  const theme = useAppTheme();

  function difficultyColor(d: string): string {
    if (d === 'easy') return theme.accent;
    if (d === 'medium') return theme.warning;
    return theme.danger;
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Interview',
      'Remove this interview from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(report),
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(report)}
      style={{
        backgroundColor: theme.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
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
        backgroundColor: scoreTierColor(report.averageScore) + '18',
        borderWidth: 2,
        borderColor: scoreTierColor(report.averageScore) + '50',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '800',
          color: scoreTierColor(report.averageScore),
        }}>
          {report.averageScore}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}
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
            backgroundColor: theme.primary + '15',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: theme.primary + '30',
          }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.primary,
              textTransform: 'capitalize',
            }}>
              {report.sessionType}
            </Text>
          </View>

          {/* Questions count */}
          <Text style={{ fontSize: 11, color: theme.textMuted, alignSelf: 'center' }}>
            {report.questionsCount}Q
          </Text>
        </View>

        <Text style={{ fontSize: 12, color: theme.textMuted }}>
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
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
});
