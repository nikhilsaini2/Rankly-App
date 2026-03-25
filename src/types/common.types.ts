import { Ionicons } from "@expo/vector-icons";
import { TextStyle, ViewStyle } from "react-native";
export type AppNameProps = {
  size?: number;
  style?: TextStyle;
};

export type Feature = {
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export type Bar = {
  label: string;
  value: number;
  colors: readonly [string, string];
};

export type ButtonProps = {
  onPress?: () => void;
  leftText?: string;
  rightText?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
};
