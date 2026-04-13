import React from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../../theme/color'
import { resumeStyles } from '../styles/resume.styles'
import type { ResumeHistoryItem } from '../types/resume.types'

interface ResumeHistoryCardProps {
  item: ResumeHistoryItem
  onPress: () => void
  onDelete: () => void
}

export const ResumeHistoryCard: React.FC<ResumeHistoryCardProps> = ({
  item, onPress, onDelete
}) => (
  <TouchableOpacity
    style={resumeStyles.historyCard}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={resumeStyles.historyCardInner}>
      {/* Left — Icon Circle */}
      <View style={resumeStyles.historyCardIcon}>
        <Ionicons
          name="document-text"
          size={22}
          color={colors.accent}
        />
      </View>

      {/* Center — Info */}
      <View style={resumeStyles.historyCardInfo}>
        <Text style={resumeStyles.historyCardName}>
          {item.full_name}
        </Text>
        <Text style={resumeStyles.historyCardRole}>
          {item.target_role}
        </Text>
        <View style={resumeStyles.historyCardMeta}>
          {item.experience_level && (
            <View style={resumeStyles.metaPill}>
              <Text style={resumeStyles.metaPillText}>
                {item.experience_level}
              </Text>
            </View>
          )}
          {item.industry && (
            <View style={resumeStyles.metaPill}>
              <Text style={resumeStyles.metaPillText}>
                {item.industry}
              </Text>
            </View>
          )}
          {item.tone && (
            <View
              style={[resumeStyles.metaPill, resumeStyles.metaPillAccent]}
            >
              <Text
                style={[
                  resumeStyles.metaPillText,
                  resumeStyles.metaPillAccentText,
                ]}
              >
                {item.tone}
              </Text>
            </View>
          )}
        </View>
        {item.core_skills && item.core_skills.length > 0 && (
          <Text
            style={resumeStyles.historyCardSkills}
            numberOfLines={1}
          >
            {item.core_skills.slice(0, 4).join(' • ')}
          </Text>
        )}
      </View>

      {/* Right — Date + Delete */}
      <View style={resumeStyles.historyCardRight}>
        <Text style={resumeStyles.historyCardDate}>
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <TouchableOpacity
          onPress={onDelete}
          style={resumeStyles.historyDeleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={15} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
)

interface ResumeHistoryListProps {
  history: ResumeHistoryItem[]
  loading: boolean
  onSelect: (item: ResumeHistoryItem) => void
  onDelete: (id: string) => void
  onBuildNew: () => void
  onLoadMore: () => void
}

export const ResumeHistoryList: React.FC<ResumeHistoryListProps> = ({
  history, loading, onSelect, onDelete, onBuildNew, onLoadMore
}) => {
  if (loading) {
    return (
      <View style={resumeStyles.historyLoadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={resumeStyles.historyLoadingText}>Loading resumes...</Text>
      </View>
    )
  }

  if (history.length === 0) {
    return (
      <View style={resumeStyles.emptyState}>
        <View style={resumeStyles.emptyIconCircle}>
          <Ionicons
            name="document-text-outline"
            size={40}
            color={colors.textSecondary}
          />
        </View>
        <Text style={resumeStyles.emptyTitle}>No resumes yet</Text>
        <Text style={resumeStyles.emptySubtitle}>
          Your built resumes will appear here
        </Text>
        <TouchableOpacity
          style={resumeStyles.emptyAction}
          onPress={onBuildNew}
        >
          <Text style={resumeStyles.emptyActionText}>Build Your First Resume</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ResumeHistoryCard
          item={item}
          onPress={() => onSelect(item)}
          onDelete={() => onDelete(item.id)}
        />
      )}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  )
}
