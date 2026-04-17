import { StyleSheet } from "react-native";
import type { AppTheme } from "../../../theme";

export function createRegisterStyles(theme: AppTheme) {
  const isLight = theme.background === "#F3F4F8";

  return StyleSheet.create({
    // ── Screen ──────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: isLight ? "#F5F6FA" : theme.bgPrimary,
    },

    bgGlow: {
      position: "absolute",
      top: -60,
      left: -40,
      width: 220,
      height: 220,
      borderRadius: 220,
      opacity: isLight ? 0 : 0.12,
    },

    // FIX 2: Reduced top spacing to match onboarding
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      marginBottom: 6,
      alignItems: "flex-start",
    },

    backBtn: {
      padding: 8,
    },

    // FIX 1: Removed artificial vertical stretching
    scroll: {
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 8,
    },

    // FIX 2: Tighter title spacing
    titleWrap: {
      marginTop: 6,
      marginBottom: 12,
      alignItems: "center",
    },

    title: {
      color: theme.textPrimary,
      fontSize: 24,
      fontWeight: "800",
    },

    subtitle: {
      color: theme.textMuted,
      marginTop: 4,
      fontSize: 12,
    },

    // FIX 3: Compressed card padding
    card: {
      backgroundColor: isLight ? "#FFFFFF" : theme.glass,
      borderRadius: 20,
      padding: 16,
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
      gap: 8,
    },

    // FIX 5: Tighter label spacing
    label: {
      color: isLight ? "#374151" : theme.inputLabel,
      fontSize: isLight ? 11 : 10,
      fontWeight: isLight ? "600" : "400",
      marginBottom: 4,
      marginTop: isLight ? 10 : 8,
      letterSpacing: 0.5,
    },

    // FIX 4: Reduced input height
    input: {
      backgroundColor: isLight ? "#F9FAFB" : theme.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: isLight ? 14 : 12,
      paddingVertical: 10,
      height: 44,
      color: isLight ? "#111111" : theme.textPrimary,
      borderWidth: isLight ? 1.5 : 1,
      borderColor: isLight ? "#D1D5DB" : theme.border,
      fontSize: 14,
    },

    inputRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    // FIX 6: Compressed role chips
    roles: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },

    roleChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
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

    // FIX 7: Tighter CTA spacing
    cta: {
      marginTop: 14,
      height: 48,
      padding: 0,
      borderRadius: isLight ? 14 : 18,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },

    ctaText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },

    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 12,
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

    googleBtn: {
      flexDirection: "row",
      justifyContent: "center",
      padding: 12,
      borderRadius: 14,
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
      padding: 10,
      marginBottom: 10,
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
