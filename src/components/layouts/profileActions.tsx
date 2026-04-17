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
import { gradients } from "../../theme/color";
import { useAppTheme } from "../../theme/useAppTheme";

export default function ProfileActions({
  notificationsOn,
  onToggleNotifications,
  onDeleted,
}: {
  notificationsOn: boolean;
  onToggleNotifications: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const theme = useAppTheme();
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
          borderColor: theme.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="notifications-outline" size={20} color={theme.primaryLight} />
          <Text style={{ color: theme.textPrimary, fontWeight: "500" }}>
            Notifications
          </Text>
        </View>
        <Switch
          value={notificationsOn}
          onValueChange={onToggleNotifications}
          trackColor={{ false: theme.surfaceAlt, true: theme.primaryDark }}
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
            borderColor: theme.border,
          }}
        >
          <Ionicons name="shield-outline" size={20} color={theme.primaryLight} />
          <Text style={{ color: theme.textPrimary, fontWeight: "500" }}>
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
            borderColor: theme.border,
          }}
        >
          <Ionicons name="document-text-outline" size={20} color={theme.primaryLight} />
          <Text style={{ color: theme.textPrimary, fontWeight: "500" }}>
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
          borderColor: theme.error,
        }}
      >
        <Text style={{ color: theme.error, textAlign: "center" }}>Sign out</Text>
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
          borderColor: theme.danger,
        }}
      >
        <Text style={{ color: theme.danger, textAlign: "center", fontWeight: "600" }}>
          Delete account
        </Text>
      </TouchableOpacity>
    </View>
  );
}
