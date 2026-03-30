import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
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
    </Stack.Navigator>
  );
};
