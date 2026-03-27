import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { BottomTabs } from "./BottomTabs";

export const AppNavigator = () => {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="Tabs" component={BottomTabs} />
    </Stack.Navigator>
  );
};
