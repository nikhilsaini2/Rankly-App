import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  deleteUserAccountData,
  logout,
} from "../../../services/profile/profileService";
import { colors } from "../../../theme/color";
import { styles } from "../styles";

interface DangerZoneProps {
  appVersion: string;
}

export function DangerZone({ appVersion }: DangerZoneProps) {
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
          <Feather name="log-out" size={16} color={colors.primary} />
        </View>
        <Text style={styles.signOutText}>Sign Out</Text>
        <Feather name="chevron-right" size={16} color={colors.textSecondary} />
      </Pressable>

      <Pressable
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
                  } catch {
                    Alert.alert("Could not delete account data");
                  }
                },
              },
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
          <Feather name="trash-2" size={16} color={colors.danger} />
        </View>
        <Text style={styles.deleteText}>Delete Account</Text>
        <Feather name="chevron-right" size={16} color={"rgba(255,92,92,0.5)"} />
      </Pressable>

      <Text style={styles.footerCaption}>
        Version {appVersion} · Made with{" "}
        <Text style={styles.footerHeart}>♥ </Text>
        by Rankly
      </Text>
    </Animated.View>
  );
}
