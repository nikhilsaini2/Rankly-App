import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import VoiceInterviewScreen from "../screens/ai/VoiceInterviewScreen";
import ATSScoreScreen from "../screens/resume/ATSScoreScreen";
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
      <Stack.Screen name="AtsScore" component={ATSScoreScreen} />
      <Stack.Screen
        name="VoiceInterview"
        component={VoiceInterviewScreen}
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
    </Stack.Navigator>
  );
};
