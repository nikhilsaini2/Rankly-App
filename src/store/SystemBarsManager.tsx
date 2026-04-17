/**
 * SystemBarsManager
 *
 * Reacts to the active Redux theme and updates:
 * - Status bar style (time, battery, signal icons)
 * - Android navigation bar style (back/home/recents icons)
 *
 * Light theme → dark icons on light background (style: "dark")
 * Dark theme  → light icons on dark background (style: "light")
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

  // Update Android navigation bar icon style whenever theme changes
  React.useEffect(() => {
    if (Platform.OS !== "android") return;
    try {
      // "dark"  → dark icons (for light nav bar background)
      // "light" → light icons (for dark nav bar background)
      NavigationBar.setStyle(isLight ? "dark" : "light");
      // Also tint the nav bar background to match the theme
      NavigationBar.setBackgroundColorAsync(isLight ? "#F3F4F8" : "#0A0812").catch(() => {});
    } catch {
      // Activity may not be ready — safe to ignore
    }
  }, [isLight]);

  // expo-status-bar StatusBar component handles iOS + Android status bar.
  // style="dark"  → dark icons (clock, battery) — use on light backgrounds
  // style="light" → light icons                 — use on dark backgrounds
  return <StatusBar style={isLight ? "dark" : "light"} />;
}
