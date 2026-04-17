import { StyleSheet } from "react-native";
import type { AppTheme } from "../../../theme";

export function createOnboardingStyles(theme: AppTheme) {
  const isLight = theme.background === "#F3F4F8";

  return StyleSheet.create({
    // ── Screen ──────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: isLight ? "#F5F6FA" : theme.bgPrimary,
      padding: 20,
    },

    // FIX 6: Suppress washed-out gradient glow in light mode
    bgGlow: {
      position: "absolute",
      top: -120,
      width: "100%",
      height: 300,
      borderRadius: 300,
      backgroundColor: theme.primary,
      opacity: isLight ? 0 : 0.15,
    },

    header: {
      marginBottom: 20,
    },

    cardWrapper: {
      marginBottom: 30,
    },

    // FIX 1: Preview card pops — solid white, real shadow in light mode
    card: {
      borderRadius: isLight ? 20 : 26,
      padding: 20,
      borderWidth: 1,
      borderColor: isLight ? "#E5E7EB" : theme.borderStrong,
      backgroundColor: isLight ? "#FFFFFF" : theme.glass,
      shadowColor: isLight ? "#000" : theme.primary,
      shadowOffset: { width: 0, height: isLight ? 4 : 10 },
      shadowOpacity: isLight ? 0.06 : 0.4,
      shadowRadius: isLight ? 20 : 30,
      elevation: isLight ? 6 : 25,
    },

    topHighlight: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: isLight ? "#E5E7EB" : theme.border,
    },

    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },

    ringOuter: {
      width: 78,
      height: 78,
      borderRadius: 40,
      backgroundColor: isLight ? "#F1F2F6" : theme.bgSecondary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },

    title: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.3,
    },

    meta: {
      color: theme.textSecondary,
      fontSize: 12,
      marginBottom: 6,
    },

    badge: {
      backgroundColor: isLight ? "#ECFDF5" : theme.success + "25",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },

    badgeText: {
      color: theme.success,
      fontSize: 12,
      fontWeight: "600",
    },

    barRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
    },

    barLabel: {
      width: 80,
      color: theme.textSecondary,
      fontSize: 12,
    },

    barTrack: {
      flex: 1,
      height: 6,
      backgroundColor: isLight ? "#E5E7EB" : theme.bgSecondary,
      borderRadius: 4,
      marginHorizontal: 10,
      overflow: "hidden",
    },

    barFill: {
      height: 6,
      borderRadius: 4,
    },

    barValue: {
      color: theme.textSecondary,
      fontSize: 12,
      width: 30,
      textAlign: "right",
    },

    features: {
      gap: 12,
    },

    // FIX 1 + FIX 4: Feature items — solid white cards in light mode
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: isLight ? "#FFFFFF" : theme.glass,
      borderWidth: 1,
      borderColor: isLight ? "#E5E7EB" : theme.border,
      shadowColor: "#000",
      shadowOpacity: isLight ? 0.04 : 0.3,
      shadowRadius: isLight ? 8 : 10,
      elevation: isLight ? 2 : 0,
    },

    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isLight ? theme.primary + "15" : theme.primary + "25",
      borderWidth: 1,
      borderColor: isLight ? theme.primary + "30" : theme.borderStrong,
    },

    featureTitle: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },

    featureSub: {
      color: theme.textMuted,
      fontSize: 11,
    },

    // FIX 4: CTA — strong, full-height, white text
    cta: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 30,
      padding: 18,
      borderRadius: 24,
      alignItems: "center",
      backgroundColor: theme.primary,
      // Light mode: subtle shadow instead of heavy glow
      shadowColor: isLight ? "#000" : theme.secondary,
      shadowOpacity: isLight ? 0.15 : 0.8,
      shadowRadius: isLight ? 12 : 25,
      elevation: isLight ? 6 : 20,
    },

    ctaText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 16,
    },

    ctaContainer: {},

    loadingContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },

    // FIX 5: Ghost button — solid white, visible border in light mode
    ghostBtn: {
      marginTop: 20,
      marginBottom: 40,
      padding: 18,
      borderRadius: 20,
      alignItems: "center",
      backgroundColor: isLight ? "#FFFFFF" : theme.bgSecondary,
      borderWidth: 1,
      borderColor: isLight ? "#D1D5DB" : theme.border,
      shadowColor: "#000",
      shadowOpacity: isLight ? 0.04 : 0.25,
      shadowRadius: isLight ? 6 : 12,
      elevation: isLight ? 2 : 0,
    },

    ghostText: {
      color: isLight ? "#374151" : theme.textSecondary,
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
  });
}
