import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { logout } from "../../services/profile/profileService";
import { colors, gradients } from "../../theme/color";

const Item = ({ icon, title }: any) => (
  <TouchableOpacity activeOpacity={0.9}>
    <LinearGradient
      colors={[gradients.card[0], gradients.card[1]]}
      style={{
        padding: 16,
        borderRadius: 18,
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name={icon} size={20} color={colors.primaryLight} />
      <Text style={{ color: colors.textPrimary, fontWeight: "500" }}>
        {title}
      </Text>
    </LinearGradient>
  </TouchableOpacity>
);

const ProfileActions = () => {
  return (
    <View>
      <Item icon="sparkles-outline" title="Upgrade to Pro" />
      <Item icon="settings-outline" title="Settings" />
      <Item icon="help-circle-outline" title="Help & Support" />

      <TouchableOpacity
        onPress={logout}
        style={{
          marginTop: 10,
          padding: 16,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.error,
        }}
      >
        <Text style={{ color: colors.error, textAlign: "center" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ProfileActions);
