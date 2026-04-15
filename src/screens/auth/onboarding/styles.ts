import { StyleSheet } from "react-native";
import { colors } from "../../../theme/color";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    padding: 20,
  },

  bgGlow: {
    position: "absolute",
    top: -120,
    width: "100%",
    height: 300,
    borderRadius: 300,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },

  header: {
    marginBottom: 20,
  },

  cardWrapper: {
    marginBottom: 30,
  },

  card: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.glass,

    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 25,
  },

  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
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
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  meta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },

  badge: {
    backgroundColor: colors.success + "25",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  badgeText: {
    color: colors.success,
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
    color: colors.textSecondary,
    fontSize: 12,
  },

  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: "hidden",
  },

  barFill: {
    height: 6,
    borderRadius: 4,
  },

  barValue: {
    color: colors.textSecondary,
    fontSize: 12,
    width: 30,
    textAlign: "right",
  },

  features: {
    gap: 12,
  },

  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary + "25",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  featureTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  featureSub: {
    color: colors.textMuted,
    fontSize: 11,
  },

  cta: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
    padding: 18,
    borderRadius: 24,
    alignItems: "center",

    backgroundColor: colors.primary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 20,
  },

  ctaText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },

  ctaContainer: {
    // marginTop: 30,
  },

  loadingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  ghostBtn: {
    marginTop: 20,
    marginBottom: 40,
    padding: 18,
    borderRadius: 20,
    alignItems: "center",

    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },

  ghostText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
