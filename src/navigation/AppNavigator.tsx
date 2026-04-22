import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Platform } from "react-native";
import InterviewHistoryScreen from "../feature/interview/screens/InterviewHistoryScreen";
import ATSScoreScreen from "../feature/resume/screens/ATSScoreScreen";
import ImprovedResumePreviewScreen from "../feature/resume/screens/ImprovedResumePreviewScreen";
import ResumeBuilderScreen from "../feature/resume/screens/ResumeBuilderScreen";
import ResumeHistoryScreen from "../feature/resume/screens/ResumeHistoryScreen";
import PdfViewerScreen from "../screens/PdfViewer";
import PremiumScreen from "../screens/premium/PremiumScreen";
import SalaryNegotiationScreen from "../screens/salary/SalaryNegotiationScreen";
import type { RootStackParamList } from "../types/navigation.types";
import { BottomTabs } from "./BottomTabs";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        component={ATSScoreScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="SalaryNegotiation"
        component={SalaryNegotiationScreen}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="ResumeBuilder"
        component={ResumeBuilderScreen}
        options={{
          headerShown: false,
          // fullScreenModal on iOS, slide_from_bottom on Android to prevent tab bar flicker
          presentation: Platform.OS === "ios" ? "fullScreenModal" : "card",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="PdfViewer"
        component={PdfViewerScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="ImprovedResumePreview"
        component={ImprovedResumePreviewScreen}
        options={{
          headerShown: false,
          presentation: Platform.OS === "ios" ? "fullScreenModal" : "card",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="InterviewHistory"
        component={InterviewHistoryScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="ResumeHistory"
        component={ResumeHistoryScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </Stack.Navigator>
  );
};
