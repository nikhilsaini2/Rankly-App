import { StyleSheet } from "react-native";
import type { AppTheme } from "../../../theme";

export function createLoginStyles(theme: AppTheme) {
  // Detect light mode by checking background token
  const isLight = theme.background === "#F3F4F8";

  return StyleSheet.create({
    // ── Screen ──────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      // FIX 6: Neutral base — no gradient noise in light mode
      backgroundColor: isLight ? "#F5F6FA" : theme.bgPrimary,
    },

    bgGlow: {
      position: "absolute",
      top: -60,
      left: -40,
      width: 220,
      height: 220,
      borderRadius: 220,
      // FIX 6: Suppress glow in light mode — it washes out the UI
      opacity: isLight ? 0 : 0.12,
    },

    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      marginBottom: 20,
      alignItems: "flex-start",
    },

    backBtn: {
      padding: 8,
    },

    scroll: {
      padding: 20,
      paddingTop: 20,
      paddingBottom: 40,
      marginTop: "25%",
    },

    titleWrap: {
      marginBottom: 15,
      alignItems: "center",
    },

    title: {
      color: theme.textPrimary,
      fontSize: 27,
      fontWeight: "800",
    },

    subtitle: {
      color: theme.textMuted,
      marginTop: 4,
      fontSize: 12,
    },

    // FIX 1: Auth card must pop — solid white, visible border, elevation
    card: {
      backgroundColor: isLight ? "#FFFFFF" : theme.glass,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: isLight ? "#E5E7EB" : theme.borderStrong,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isLight ? 4 : 10 },
      shadowOpacity: isLight ? 0.06 : 0.4,
      shadowRadius: isLight ? 20 : 30,
      elevation: isLight ? 6 : 25,
    },

    row: {
      flexDirection: "row",
      gap: 10,
    },

    // FIX 3: Label contrast
    label: {
      color: isLight ? "#374151" : theme.inputLabel,
      fontSize: isLight ? 11 : 10,
      fontWeight: isLight ? "600" : "400",
      marginBottom: 6,
      marginTop: isLight ? 16 : 10,
      letterSpacing: 0.5,
    },

    // FIX 2: Input field visibility — clearly distinct from background
    input: {
      backgroundColor: isLight ? "#F9FAFB" : theme.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: isLight ? 14 : 12,
      paddingVertical: 12,
      height: isLight ? 48 : undefined,
      color: isLight ? "#111111" : theme.textPrimary,
      borderWidth: isLight ? 1.5 : 1,
      borderColor: isLight ? "#D1D5DB" : theme.border,
      fontSize: 14,
    },

    inputRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    dropdown: {
      position: "absolute",
      right: 12,
      color: theme.textSecondary,
      fontSize: 14,
    },

    roles: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 6,
    },

    roleChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: isLight ? "#F9FAFB" : theme.bgSecondary,
      borderWidth: 1,
      borderColor: isLight ? "#D1D5DB" : theme.border,
    },

    roleChipActive: {
      backgroundColor: theme.primary + "20",
      borderColor: theme.secondary,
    },

    roleText: {
      color: theme.textSecondary,
      fontSize: 11,
      fontWeight: "600",
    },

    roleTextActive: {
      color: isLight ? theme.primary : theme.primaryLight,
    },

    // FIX 4: CTA must be the strongest visual element
    cta: {
      marginTop: 18,
      height: isLight ? 52 : undefined,
      padding: isLight ? 0 : 16,
      borderRadius: isLight ? 14 : 18,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },

    // FIX 4: White text on gradient — always readable
    ctaText: {
      color: theme.onPrimary,
      fontSize: isLight ? 16 : 14,
      fontWeight: "700",
    },

    // FIX 7: Divider visibility
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 18,
    },

    line: {
      flex: 1,
      height: 1,
      backgroundColor: isLight ? "#E5E7EB" : theme.border,
    },

    dividerText: {
      marginHorizontal: 10,
      color: theme.textMuted,
      fontSize: 10,
    },

    // FIX 5: Secondary button — solid white, visible border
    googleBtn: {
      flexDirection: "row",
      justifyContent: "center",
      padding: 14,
      borderRadius: 16,
      backgroundColor: isLight ? "#FFFFFF" : theme.bgSecondary,
      borderWidth: 1,
      borderColor: isLight ? "#D1D5DB" : theme.border,
      alignItems: "center",
    },

    googleText: {
      color: isLight ? "#374151" : theme.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },

    googleIcon: {
      marginRight: 10,
      width: 20,
      height: 20,
    },

    // FIX 8: Error text — readable size and color
    error: {
      color: isLight ? "#DC2626" : theme.error,
      fontSize: 12,
      paddingTop: 2,
    },

    errorBanner: {
      backgroundColor: isLight ? "#FEF2F2" : theme.error + "20",
      borderColor: isLight ? "#DC2626" : theme.error,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },

    errorBannerText: {
      color: isLight ? "#DC2626" : theme.error,
      fontSize: 12,
      fontWeight: "500",
      textAlign: "center",
    },

    inputError: {
      borderColor: isLight ? "#DC2626" : theme.error,
    },

    passwordToggle: {
      position: "absolute",
      right: 12,
      padding: 8,
    },
  });
}
