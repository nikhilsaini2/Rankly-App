import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PdfViewerScreen from "../screens/PdfViewer";
import ATSScoreScreen from "../screens/resume/ATSScoreScreen";
import ResumeBuilderScreen from "../screens/resume/ResumeBuilderScreen";
import SalaryNegotiationScreen from "../screens/salary/SalaryNegotiationScreen";
import type { RootStackParamList } from "../types/navigation.types";
import { BottomTabs } from "./BottomTabs";

const Stack = createNativeStackNavigator<RootStackParamList>();

function ScreenWrapper({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 48) : insets.bottom;

  return (
    <View style={{ flex: 1, paddingBottom: bottomInset }}>{children}</View>
  );
}

function withScreenWrapper<P extends object>(Screen: React.ComponentType<P>) {
  return (props: P) => (
    <ScreenWrapper>
      <Screen {...props} />
    </ScreenWrapper>
  );
}

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="Tabs" component={BottomTabs} />
      <Stack.Screen
        name="AtsScore"
        component={withScreenWrapper(ATSScoreScreen)}
      />
      <Stack.Screen
        name="SalaryNegotiation"
        component={withScreenWrapper(SalaryNegotiationScreen)}
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="ResumeBuilder"
        component={withScreenWrapper(ResumeBuilderScreen)}
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="PdfViewer"
        component={withScreenWrapper(PdfViewerScreen)}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
