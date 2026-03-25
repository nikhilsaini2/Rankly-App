import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import AIScreen from "../screens/ai/AIScreen";
import BuilderScreen from "../screens/builder/BuilderScreen";
import HomeScreen from "../screens/home/HomeScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import { RootTabParamList } from "../types/navigation.types";
import { TabBar } from "./TabBar";

const Tab = createBottomTabNavigator<RootTabParamList>();

export const BottomTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Builder" component={BuilderScreen} />
      <Tab.Screen name="AI" component={AIScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
