export const colors = {
  /** Spec: near-black screen bg — alias with legacy name */
  background: "#0D0D14",
  surface: "#16161F",
  surfaceAlt: "#1E1E2E",

  bgPrimary: "#0D0D14",
  bgSecondary: "#16161F",
  glass: "rgba(22, 22, 31, 0.92)",

  /** Electric violet — CTAs */
  primary: "#6C63FF",
  primaryDark: "#5248CC",

  secondary: "#8B5CF6",
  secondaryDark: "#6C63FF",

  primaryLight: "#A78BFA",
  accent: "#00D4AA",
  danger: "#FF5C5C",
  warning: "#FFB347",

  textPrimary: "#F0F0FF",
  textSecondary: "#9090B0",
  textMuted: "#71717A",

  border: "#2A2A3D",
  borderStrong: "rgba(108, 99, 255, 0.35)",

  success: "#00D4AA",
  successDark: "#065F46",
  error: "#FF5C5C",

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
