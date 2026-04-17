import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/useAppTheme";

export const GlobalBackground = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.bgPrimary, theme.bgSecondary, theme.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ height: insets.top }} />
      {children}
    </View>
  );
};
