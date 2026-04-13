import React from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { resumeStyles } from '../styles/resume.styles'

interface PillSelectorProps {
  options: string[]
  selected: string | string[]   // string = single, string[] = multi
  onSelect: (value: string) => void
  multiSelect?: boolean
  label?: string
}

export const PillSelector: React.FC<PillSelectorProps> = ({
  options, selected, onSelect, multiSelect, label
}) => {
  const isSelected = (opt: string) =>
    multiSelect
      ? (selected as string[]).includes(opt)
      : selected === opt

  return (
    <View style={resumeStyles.fieldGroup}>
      {label && (
        <Text style={resumeStyles.fieldLabel}>{label}</Text>
      )}
      <View style={resumeStyles.pillGrid}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[
              resumeStyles.pill,
              isSelected(opt) && resumeStyles.pillSelected,
            ]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[
              resumeStyles.pillText,
              isSelected(opt) && resumeStyles.pillTextSelected,
            ]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
