import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import LoginScreen from "../screens/auth/login/LoginScreen";
import OnBoardingScreen from "../screens/auth/onboarding/OnBoardingScreen";
import RegisterScreen from "../screens/auth/register/RegisterScreen";
import HomeScreen from "../screens/home/HomeScreen";
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
      <Stack.Screen name="Onboarding" component={OnBoardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Tabs" component={BottomTabs} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
};
