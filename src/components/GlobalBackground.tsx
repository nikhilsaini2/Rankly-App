import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/color";

export const GlobalBackground = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[colors.bgPrimary, colors.bgSecondary, colors.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ height: insets.top }} />
      {children}
    </View>
  );
};
