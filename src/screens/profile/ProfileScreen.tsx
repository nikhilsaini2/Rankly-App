import React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useProfile } from "../../hooks/useProfile";
import { colors } from "../../theme/color";

import { LinearGradient } from "expo-linear-gradient";
import ProfileActions from "../../components/layouts/profileActions";
import ProfileHeader from "../../components/layouts/profileHeader";
import ProfileStats from "../../components/layouts/profileStats";

const ProfileScreen = () => {
  const { user, loading } = useProfile();

  if (loading || !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgPrimary,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[colors.primary, "transparent"]}
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: 300,
          top: -100,
          left: -100,
          opacity: 0.4,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 50,
        }}
      >
        <ProfileHeader user={user} />
        <ProfileStats />
        <ProfileActions />
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
