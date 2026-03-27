import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { colors, shadows } from "../../theme/color";
import { User } from "../../types/common.types";

const ProfileHeader = ({ user }: { user: User }) => {
  return (
    <View style={{ alignItems: "center", marginBottom: 30 }}>
      <LinearGradient
        colors={[colors.secondary, colors.secondaryDark]}
        style={{
          padding: 3,
          borderRadius: 999,
          ...shadows.glow,
        }}
      >
        <Image
          source={{
            uri:
              user.avatarUrl ||
              `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`,
          }}
          style={{
            width: 110,
            height: 110,
            borderRadius: 999,
          }}
        />
      </LinearGradient>

      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 22,
          fontWeight: "700",
          marginTop: 14,
        }}
      >
        {user.firstName} {user.lastName}
      </Text>

      <Text style={{ color: colors.textMuted, marginTop: 4 }}>{user.role}</Text>

      <Text
        numberOfLines={2}
        style={{
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 8,
          paddingHorizontal: 20,
        }}
      >
        {user.bio || "No bio added yet"}
      </Text>

      <TouchableOpacity
        activeOpacity={0.9}
        style={{
          marginTop: 16,
        }}
      >
        <LinearGradient
          colors={[colors.secondary, colors.secondaryDark]}
          style={{
            paddingHorizontal: 22,
            paddingVertical: 10,
            borderRadius: 25,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="create-outline" size={16} color="white" />
          <Text style={{ color: "white", fontWeight: "600" }}>
            Edit Profile
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ProfileHeader);
