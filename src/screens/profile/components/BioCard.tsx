import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import type { User } from "../../../types/common.types";
import { styles } from "../styles";

interface BioCardProps {
  user: User;
  onEdit: () => void;
}

export function BioCard({ user, onEdit }: BioCardProps) {
  return (
    <Animated.View style={[styles.bioCard]}>
      <View style={styles.bioHeaderRow}>
        <Text style={styles.sectionCap}>ABOUT</Text>
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.bioEditLink}>Edit</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.bioText, !user.bio && styles.bioPlaceholder]}>
        {user.bio
          ? user.bio
          : "No bio added yet. Tap Edit to add a short description about yourself."}
      </Text>
    </Animated.View>
  );
}
