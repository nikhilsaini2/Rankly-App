import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  deleteUserAccountData,
  logout,
} from "../../../services/profile/profileService";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createProfileStyles } from "../styles";

interface DangerZoneProps {
  appVersion: string;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export function DangerZone({ appVersion, onError, onSuccess }: DangerZoneProps) {
  const theme = useAppTheme();
  const styles = createProfileStyles(theme);

  async function handleDeleteAccount() {
    try {
      await deleteUserAccountData();
      onSuccess?.("Account deleted successfully.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Account deletion failed";
      if (msg.includes("AUTH_SESSION_MISSING")) {
        onError?.("Session expired. Please login again.");
      } else {
        onError?.("Could not delete account. Try again.");
      }
    }
  }

  return (
    <Animated.View style={[styles.dangerWrap]}>
      <Pressable
        onPress={logout}
        style={({ pressed }) => [
          styles.dangerRow,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={[styles.dangerIconCircle, styles.dangerIconPrimaryBg]}>
          <Feather name="log-out" size={16} color={theme.primary} />
        </View>
        <Text style={styles.signOutText}>Sign Out</Text>
        <Feather name="chevron-right" size={16} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() =>
          Alert.alert(
            "Delete Account",
            "This will permanently delete your account and all data. You will not be able to log in again.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: handleDeleteAccount },
            ],
          )
        }
        style={({ pressed }) => [
          styles.dangerRow,
          styles.deleteRow,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={[styles.dangerIconCircle, styles.dangerIconDangerBg]}>
          <Feather name="trash-2" size={16} color={theme.danger} />
        </View>
        <Text style={styles.deleteText}>Delete Account</Text>
        <Feather name="chevron-right" size={16} color={"rgba(255,92,92,0.5)"} />
      </Pressable>

      <Text style={styles.footerCaption}>
        Version {appVersion} · Made with{" "}
        <Text style={styles.footerHeart}>♥ </Text>
        by Nikhil
      </Text>
    </Animated.View>
  );
}
