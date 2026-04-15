import { StyleSheet } from "react-native";
import { colors } from "../../../theme/color";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },

  bgGlow: {
    position: "absolute",
    top: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    opacity: 0.12,
  },

  header: {
    marginTop: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    color: colors.textPrimary,
    fontSize: 27,
    fontWeight: "800",
  },

  subtitle: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
  },

  card: {
    backgroundColor: colors.glass,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  label: {
    color: colors.inputLabel,
    fontSize: 10,
    marginBottom: 6,
    marginTop: 10,
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  dropdown: {
    position: "absolute",
    right: 12,
    color: colors.textSecondary,
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
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  roleChipActive: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.secondary,
  },

  roleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },

  roleTextActive: {
    color: colors.primaryLight,
  },

  cta: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },

  ctaText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    marginHorizontal: 10,
    color: colors.textMuted,
    fontSize: 10,
  },

  googleBtn: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },

  googleText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },

  googleIcon: {
    marginRight: 10,
    width: 20,
    height: 20,
  },

  error: {
    color: colors.error,
    fontSize: 10,
    paddingTop: 2,
  },

  errorBanner: {
    backgroundColor: colors.error + "20",
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  errorBannerText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },

  inputError: {
    borderColor: colors.error,
  },

  passwordToggle: {
    position: "absolute",
    right: 12,
    padding: 8,
  },
});
