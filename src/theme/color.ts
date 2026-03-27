export const colors = {
  bgPrimary: "#05060A",
  bgSecondary: "#0A0F1F",
  glass: "rgba(20, 15, 40, 0.85)",

  primary: "#7638E3",
  primaryDark: "#5625A3",

  secondary: "#9B5CFF",
  secondaryDark: "#7638E3",

  primaryLight: "#A78BFA",

  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",

  border: "rgba(239, 235, 243, 0.29)",
  borderStrong: "rgba(124,58,237,0.25)",

  success: "#22C55E",
  successDark: "#065F46",
  error: "#EF4444",

  glow: "#A78BFA",
};

export const gradients = {
  primary: ["#9B5CFF", "#7638E3", "#5228CC"] as const,
  success: ["#22C55E", "#065F46"] as const,
  card: ["rgba(20,15,40,0.9)", "rgba(10,10,30,0.9)"] as const,
};

export const shadows = {
  glow: {
    shadowColor: "#7638E3",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
};
