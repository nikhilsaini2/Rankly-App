import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import LoginScreen from "../screens/auth/login/LoginScreen";
import OnBoardingScreen from "../screens/auth/onboarding/OnBoardingScreen";
import RegisterScreen from "../screens/auth/register/RegisterScreen";
import type { AuthStackParamList } from "../types/navigation.types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnBoardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};
