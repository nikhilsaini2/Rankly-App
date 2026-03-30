import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import React from "react";
import {
  Alert,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteUserAccountData,
  logout,
} from "../../services/profile/profileService";
import { colors, gradients } from "../../theme/color";

export default function ProfileActions({
  notificationsOn,
  onToggleNotifications,
  onDeleted,
}: {
  notificationsOn: boolean;
  onToggleNotifications: (v: boolean) => void;
  onDeleted: () => void;
}) {
  return (
    <View>
      <LinearGradient
        colors={[gradients.card[0], gradients.card[1]]}
        style={{
          padding: 16,
          borderRadius: 18,
          marginBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="notifications-outline" size={20} color={colors.primaryLight} />
          <Text style={{ color: colors.textPrimary, fontWeight: "500" }}>
            Notifications
          </Text>
        </View>
        <Switch
          value={notificationsOn}
          onValueChange={onToggleNotifications}
          trackColor={{ false: colors.surfaceAlt, true: colors.primaryDark }}
        />
      </LinearGradient>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          Linking.openURL("https://example.com/privacy").catch(() => {})
        }
      >
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
          <Ionicons name="shield-outline" size={20} color={colors.primaryLight} />
          <Text style={{ color: colors.textPrimary, fontWeight: "500" }}>
            Privacy Policy
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          Linking.openURL("https://example.com/terms").catch(() => {})
        }
      >
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
          <Ionicons name="document-text-outline" size={20} color={colors.primaryLight} />
          <Text style={{ color: colors.textPrimary, fontWeight: "500" }}>
            Terms of Service
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={logout}
        style={{
          marginTop: 6,
          padding: 16,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.error,
        }}
      >
        <Text style={{ color: colors.error, textAlign: "center" }}>Sign out</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "Delete account",
            "This removes your Rankly profile data from this device session. You may need to contact support to fully remove your auth account.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteUserAccountData();
                    onDeleted();
                  } catch {
                    Alert.alert("Could not delete account data");
                  }
                },
              },
            ],
          )
        }
        style={{
          marginTop: 12,
          padding: 16,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.danger,
        }}
      >
        <Text style={{ color: colors.danger, textAlign: "center", fontWeight: "600" }}>
          Delete account
        </Text>
      </TouchableOpacity>
    </View>
  );
}
