/**
 * SystemBarsManager
 *
 * Reacts to the active Redux theme and updates:
 * - Status bar style (time, battery, signal icons)
 * - Android navigation bar style (back/home/recents icons)
 *
 * Light theme → dark icons on light background
 * Dark theme  → light icons on dark background
 *
 * Must be rendered inside the Redux <Provider>.
 */
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "./store";

export function SystemBarsManager() {
  const mode = useSelector((state: RootState) => state.theme.mode);
  const isLight = mode === "light";

  React.useEffect(() => {
    if (Platform.OS !== "android") return;

    const apply = async () => {
      try {
        // "dark"  → dark icons (visible on light background)
        // "light" → light icons (visible on dark background)
        await NavigationBar.setStyle(isLight ? "light" : "dark");
      } catch {
        // Activity may not be ready on first render — safe to ignore
      }
    };

    apply();
  }, [isLight]);

  return <StatusBar style={isLight ? "dark" : "light"} />;
}
