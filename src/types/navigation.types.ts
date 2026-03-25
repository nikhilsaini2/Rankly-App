import { Ionicons } from "@expo/vector-icons";
export type RootTabParamList = {
  Home: undefined;
  Builder: undefined;
  AI: undefined;
  Profile: undefined;
};

export type TabItem = {
  name: keyof RootTabParamList;
  icon: keyof typeof Ionicons.glyphMap;
};
