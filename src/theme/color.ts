export const colors = {
  background: "#0A0812",
  surface: "#130F1F",
  surfaceAlt: "#1C1830",

  bgPrimary: "#0A0812",
  bgSecondary: "#130F1F",
  glass: "rgba(19, 15, 31, 0.96)",

  primary: "#8B5CF6",
  primaryDark: "#6D28D9",

  secondary: "#A78BFA",
  secondaryDark: "#7C3AED",

  primaryLight: "#C4B5FD",

  accent: "#10B981",
  danger: "#EF4444",
  warning: "#F97316",

  textPrimary: "#FAF9FF",
  textSecondary: "#A09ABA",
  textMuted: "#6B6480",
  onPrimary: "#FFFFFF",
  inputLabel: "#bbb9c4",
  placeholder: "#99969c",

  border: "#2A2440",
  borderStrong: "rgba(139, 92, 246, 0.5)",

  success: "#10B981",
  successDark: "#064E3B",
  error: "#EF4444",

  glow: "#8B5CF6",
} as const;

export const gradients = {
  card: ["#8B5CF6", "#6D28D9"],
  primary: ["#A78BFA", "#8B5CF6"],
  secondary: ["#C4B5FD", "#A78BFA"],
};

export const shadows = {
  glow: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
};
