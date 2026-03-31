import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/color";
import { getInitials } from "../../utils";

export function HeroHeader(props: {
  greet: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  avatarUri: string;
  credits: number;
}) {
  const { greet, firstName, lastName, avatarUrl, avatarUri, credits } = props;
  return (
    <View style={heroStyles.heroContainer}>
      <LinearGradient
        colors={["rgba(108,99,255,0.15)", "transparent"]}
        style={heroStyles.heroGlow}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        pointerEvents="none"
      />
      <View style={heroStyles.heroRow}>
        <View>
          <Text style={heroStyles.heroEyebrow}>{greet.toUpperCase()}</Text>
          <Text style={heroStyles.heroTitle}>
            Hey, <Text style={heroStyles.heroNameAccent}>{firstName}</Text> 👋
          </Text>
          <Text style={heroStyles.heroSub}>Ready to land your dream job?</Text>
        </View>
        <View style={heroStyles.heroRight}>
          <View style={heroStyles.avatarRing}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUri }}
                style={heroStyles.avatarImage}
              />
            ) : (
              <View style={heroStyles.avatarFallback}>
                <Text style={heroStyles.avatarInitials}>
                  {getInitials(firstName, lastName)}
                </Text>
              </View>
            )}
          </View>
          <View style={heroStyles.creditsBadge}>
            <View style={heroStyles.creditsGreenDot} />
            <Text style={heroStyles.creditsText}>{credits} credits</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  heroContainer: {
    overflow: "hidden",
    position: "relative",
    marginTop: 8,
    marginBottom: 20,
    paddingBottom: 4,
  },
  heroGlow: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLeft: {},
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  heroNameAccent: { color: colors.primary },
  heroSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    opacity: 0.8,
    lineHeight: 18,
  },
  heroRight: { alignItems: "flex-end", gap: 6 },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  creditsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,212,170,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.2)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  creditsGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  creditsText: { fontSize: 9, fontWeight: "600", color: colors.accent },
});
