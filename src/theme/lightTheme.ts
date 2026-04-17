import { colors as dark } from "./color";

// ─── Light color tokens ───────────────────────────────────────────────────────
//
// Design principle: Light theme = clarity + contrast + emphasis (NOT softness).
// Every token is tuned for maximum readability and visual hierarchy on light backgrounds.
//
export const lightColors = {
  // ── Backgrounds / surfaces ─────────────────────────────────────────────────
  // Surface hierarchy — each layer is a distinct shade
  background:  "#F3F4F8",   // page canvas — cool gray, NOT white
  surface:     "#FFFFFF",   // cards sit ON the background — pure white for pop
  surfaceAlt:  "#F1F2F6",   // secondary surfaces (inputs, inner cards, chips)

  bgPrimary:   "#F3F4F8",   // same as background
  bgSecondary: "#F5F6FA",   // subtle step between background and surfaceAlt

  // Glass uses semi-opaque white — avoids stacking white on white
  glass: "rgba(255,255,255,0.85)",

  // ── Brand tokens — inherited unchanged ────────────────────────────────────
  // Brand colors stay vivid; gradients are adapted separately below
  primary:      dark.primary,
  primaryDark:  dark.primaryDark,
  secondary:    dark.secondary,
  secondaryDark: dark.secondaryDark,
  primaryLight: dark.primaryLight,
  accent:       dark.accent,
  danger:       dark.danger,
  warning:      dark.warning,
  success:      dark.success,
  error:        dark.error,
  glow:         dark.glow,

  // ── Text ───────────────────────────────────────────────────────────────────
  // FIX 5: Modern readable contrast scale — stronger hierarchy
  textPrimary:   "#111827",   // gray-900 — headings, primary text
  textSecondary: "#374151",   // gray-700 — body text, labels (STRONGER than before)
  textMuted:     "#6B7280",   // gray-500 — subtle metadata
  inputLabel:    "#374151",   // gray-700 — form labels
  placeholder:   "#9CA3AF",   // gray-400 — placeholder text

  // ── Borders ────────────────────────────────────────────────────────────────
  // Stronger edges to define layout on light backgrounds
  border:       "#D1D5DB",                    // gray-300 — visible card edges
  borderStrong: "rgba(139, 92, 246, 0.35)",   // brand-tinted strong border

  // ── Status backgrounds ─────────────────────────────────────────────────────
  // Status colors with proper background contrast
  successDark: "#ECFDF5",   // green-50 — success badge background
} as const;

// ─── Light gradients ──────────────────────────────────────────────────────────
// Lighter purple tones — dark gradients look too heavy on white
export const lightGradients = {
  card:      ["#A78BFA", "#8B5CF6"] as string[],   // softer purple gradient
  primary:   ["#C4B5FD", "#A78BFA"] as string[],   // pastel → mid purple
  secondary: ["#DDD6FE", "#C4B5FD"] as string[],   // very light purple range
};

// ─── Light shadows ────────────────────────────────────────────────────────────
// Real elevation system — shadow instead of glow
export const lightShadows = {
  glow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  subtle: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
};
