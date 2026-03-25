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
  },

  header: {
    marginTop: 10,
    marginBottom: 20,
  },

  cardWrapper: {
    marginBottom: 30,
  },

  card: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.25)",
    backgroundColor: "rgba(15,10,35,0.85)",

    shadowColor: "#7638E3",
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
    backgroundColor: "rgba(255,255,255,0.1)",
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
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  ringInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: "#9B5CFF",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#9B5CFF",
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },

  score: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },

  ats: {
    fontSize: 10,
    color: "#A1A1AA",
  },

  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  meta: {
    color: "#A1A1AA",
    fontSize: 12,
    marginBottom: 6,
  },

  badge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  badgeText: {
    color: "#22C55E",
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
    color: "#A1A1AA",
    fontSize: 12,
  },

  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: "hidden",
  },

  barFill: {
    height: 6,
    borderRadius: 4,
  },

  barValue: {
    color: "#A1A1AA",
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
    backgroundColor: "rgba(20,20,35,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",

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
    backgroundColor: "rgba(118,56,227,0.15)",
    borderWidth: 1,
  },

  featureTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  featureSub: {
    color: "#71717A",
    fontSize: 11,
  },

  cta: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
    padding: 18,
    borderRadius: 24,
    alignItems: "center",

    shadowColor: "#9B5CFF",
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 20,
  },

  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  ghostBtn: {
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.02)",

    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },

  ghostText: {
    color: "#A1A1AA",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
