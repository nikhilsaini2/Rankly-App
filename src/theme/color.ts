import AsyncStorage from "@react-native-async-storage/async-storage";

let currentTheme = "dark";

const loadSavedTheme = async () => {
  try {
    const saved = await AsyncStorage.getItem("@app_theme");
    if (saved === "light" || saved === "dark") {
      currentTheme = saved;
    }
  } catch (e) {}
};

loadSavedTheme();

export const colors = {
  background: currentTheme === "dark" ? "#0A0812" : "#F8F9FA",
  surface: currentTheme === "dark" ? "#130F1F" : "#FFFFFF",
  surfaceAlt: currentTheme === "dark" ? "#1C1830" : "#F1F3F5",

  bgPrimary: currentTheme === "dark" ? "#0A0812" : "#F8F9FA",
  bgSecondary: currentTheme === "dark" ? "#130F1F" : "#FFFFFF",
  glass:
    currentTheme === "dark"
      ? "rgba(19, 15, 31, 0.96)"
      : "rgba(255, 255, 255, 0.95)",

  primary: currentTheme === "dark" ? "#8B5CF6" : "#6D28D9",
  primaryDark: currentTheme === "dark" ? "#6D28D9" : "#4C1D95",

  secondary: currentTheme === "dark" ? "#A78BFA" : "#7C3AED",
  secondaryDark: currentTheme === "dark" ? "#7C3AED" : "#5B21B6",

  primaryLight: currentTheme === "dark" ? "#C4B5FD" : "#DDD6FE",

  accent: "#10B981",
  danger: "#EF4444",
  warning: "#F97316",

  textPrimary: currentTheme === "dark" ? "#FAF9FF" : "#111827",
  textSecondary: currentTheme === "dark" ? "#A09ABA" : "#4B5563",
  textMuted: currentTheme === "dark" ? "#6B6480" : "#6B7280",

  border: currentTheme === "dark" ? "#2A2440" : "#E5E7EB",
  borderStrong:
    currentTheme === "dark"
      ? "rgba(139, 92, 246, 0.5)"
      : "rgba(109, 40, 217, 0.3)",

  success: "#10B981",
  successDark: "#064E3B",
  error: "#EF4444",

  glow: currentTheme === "dark" ? "#8B5CF6" : "#6D28D9",
} as const;

export const shadows = {
  glow: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
};
