import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";
import { User } from "../../types/common.types";

const ProfileHeader = ({
  user,
  onAvatarPress,
  onEditPress,
  editing,
  onCancelEdit,
  onSaveEdit,
  saving,
}: {
  user: User;
  onAvatarPress?: () => void;
  onEditPress?: () => void;
  editing?: boolean;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  saving?: boolean;
}) => {
  const theme = useAppTheme();

  return (
    <View style={{ alignItems: "center", marginBottom: 30 }}>
      <LinearGradient
        colors={[theme.primary, theme.primaryDark]}
        style={{
          padding: 3,
          borderRadius: 999,
          shadowColor: theme.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 24,
          elevation: 24,
        }}
      >
        {onAvatarPress ? (
          <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.85}>
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
          </TouchableOpacity>
        ) : (
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
        )}
      </LinearGradient>

      <Text
        style={{
          color: theme.textPrimary,
          fontSize: 22,
          fontWeight: "700",
          marginTop: 14,
        }}
      >
        {user.firstName} {user.lastName}
      </Text>

      <Text style={{ color: theme.textMuted, marginTop: 4 }}>{user.role}</Text>

      <Text
        style={{
          color: theme.accent,
          fontSize: 12,
          marginTop: 6,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {user.plan === "pro" ? "Pro" : "Free"} · {user.credits} credits
      </Text>

      {(user.experienceLevel || user.industry) && (
        <Text
          style={{ color: theme.textSecondary, marginTop: 6, fontSize: 13 }}
        >
          {[user.experienceLevel, user.industry].filter(Boolean).join(" · ")}
        </Text>
      )}

      <Text
        numberOfLines={2}
        style={{
          color: theme.textSecondary,
          textAlign: "center",
          marginTop: 8,
          paddingHorizontal: 20,
        }}
      >
        {user.bio || "No bio added yet"}
      </Text>

      {!editing ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={{
            marginTop: 16,
          }}
          onPress={onEditPress}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            style={{
              paddingHorizontal: 22,
              paddingVertical: 10,
              borderRadius: 25,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color="#FFFFFF"
            />
            <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Edit Profile
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 16,
            width: "100%",
            maxWidth: 320,
            justifyContent: "center",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onCancelEdit}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onSaveEdit}
            disabled={saving}
            style={{ flex: 1, opacity: saving ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={[theme.primary, theme.secondaryDark]}
              style={{
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              {saving ? (
                <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Saving…
                </Text>
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  Save
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default React.memo(ProfileHeader);
