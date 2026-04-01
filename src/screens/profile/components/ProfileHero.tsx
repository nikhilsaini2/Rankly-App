import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { colors } from "../../../theme/color";
import type { User } from "../../../types/common.types";
import { styles } from "../styles";

interface ProfileHeroProps {
  user: User;
  fullName: string;
  initials: string;
  planLabel: string;
  creditsLabel: string;
  badgeStyle: any;
  avatarRingStyle: any;
  pickAvatar: () => void;
  savingAvatar: boolean;
}

export function ProfileHero({
  user,
  fullName,
  initials,
  planLabel,
  creditsLabel,
  badgeStyle,
  avatarRingStyle,
  pickAvatar,
  savingAvatar,
}: ProfileHeroProps) {
  return (
    <Animated.View style={[styles.heroWrap, badgeStyle]}>
      <LinearGradient
        colors={["rgba(108,99,255,0.18)", "rgba(13,13,20,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroBanner}
        pointerEvents="none"
      />

      <View style={styles.heroInner}>
        <View style={styles.avatarOuter}>
          <Animated.View style={[styles.avatarRing, avatarRingStyle]}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>

          <View style={styles.avatarSeparator}>
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={pickAvatar}
            style={styles.avatarEditBtn}
            accessibilityRole="button"
          >
            <Feather name="edit-2" size={13} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.heroName}>{fullName || "—"}</Text>
        <Text style={styles.heroRole}>{user.role || "—"}</Text>

        <Animated.View style={[styles.badgeRow, badgeStyle]}>
          <View style={styles.planBadge}>
            <Feather name="star" size={11} color={colors.primary} />
            <Text style={styles.planBadgeText}>{planLabel}</Text>
          </View>
          <View style={styles.creditsBadge}>
            <Feather name="zap" size={11} color={colors.accent} />
            <Text style={styles.creditsBadgeText}>{creditsLabel}</Text>
          </View>
        </Animated.View>

        {savingAvatar ? (
          <View style={styles.avatarBusyRow}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={styles.avatarBusyText}>Updating avatar…</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
