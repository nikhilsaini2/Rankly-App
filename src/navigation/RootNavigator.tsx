import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { BottomTabs } from "./BottomTabs";

// import { useSelector } from "react-redux";
// import { RootState } from "../store/auth/authStore";
// import { AppNavigator } from "./AppNavigator";
// import { AuthNavigator } from "./AuthNavigator";

const RootNavigator = () => {
  const Stack = createNativeStackNavigator();
  // const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  // return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
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

export default RootNavigator;
