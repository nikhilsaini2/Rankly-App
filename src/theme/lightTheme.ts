import { colors as dark } from "./color";

export const lightColors = {
  // Backgrounds / surfaces
  background: "#FFFFFF",
  surface: "#F7F7FB",
  surfaceAlt: "#FFFFFF",

  bgPrimary: "#FFFFFF",
  bgSecondary: "#F7F7FB",
  glass: "rgba(255,255,255,0.9)",

  // Brand tokens — inherited unchanged from dark theme
  primary: dark.primary,
  primaryDark: dark.primaryDark,

  secondary: dark.secondary,
  secondaryDark: dark.secondaryDark,

  primaryLight: dark.primaryLight,

  accent: dark.accent,
  danger: dark.danger,
  warning: dark.warning,

  // Text
  textPrimary: "#111111",
  textSecondary: "#555555",
  textMuted: "#888888",
  inputLabel: "#555555",
  placeholder: "#888888",

  // Borders
  border: "#E5E7EB",
  borderStrong: "rgba(139, 92, 246, 0.25)",

  // Status
  success: dark.success,
  successDark: "#DCFCE7",
  error: dark.error,

  glow: dark.glow,
} as const;
