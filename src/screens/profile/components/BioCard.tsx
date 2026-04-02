import React from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { User } from "../../../types/common.types";
import { styles } from "../styles";

interface BioCardProps {
  user: User;
}

export function BioCard({ user }: BioCardProps) {
  return (
    <Animated.View style={[styles.bioCard]}>
      <View style={styles.bioHeaderRow}>
        <Text style={styles.sectionCap}>ABOUT</Text>
      </View>
      <Text style={[styles.bioText, !user.bio && styles.bioPlaceholder]}>
        {user.bio
          ? user.bio
          : "No bio added yet. Tap Edit Profile to add a short description about yourself."}
      </Text>
    </Animated.View>
  );
}
