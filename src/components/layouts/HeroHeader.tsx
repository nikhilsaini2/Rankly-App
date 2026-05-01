import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";
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
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();

  return (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={[theme.primary + "20", "transparent"]}
        style={styles.heroGlow}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        pointerEvents="none"
      />
      <View style={styles.heroRow}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroEyebrow}>{greet.toUpperCase()}</Text>
          <Text style={styles.heroTitle} numberOfLines={1} ellipsizeMode="tail">
            Hey, <Text style={styles.heroNameAccent}>{firstName?.trim() || "there"}</Text> 👋
          </Text>
          <Text style={styles.heroSub}>Ready to land your dream job?</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Profile")}
          style={styles.heroRight}
        >
          <View style={styles.avatarRing}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {getInitials(firstName, lastName)}
                </Text>
              </View>
            )}
          </View>
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.creditsBadge}
          >
            <View style={styles.creditsDot} />
            <Text style={styles.creditsText}>{credits} credits</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    heroContainer: {
      overflow: "hidden",
      position: "relative",
      marginBottom: 20,
      paddingVertical: 4,
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
      alignItems: "center",
    },
    heroLeft: {
      flex: 1,
      marginRight: 12,
    },
    heroEyebrow: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.textSecondary,
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.textPrimary,
      letterSpacing: -0.8,
      lineHeight: 30,
    },
    heroNameAccent: { color: theme.primary },
    heroSub: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
      opacity: 0.8,
      lineHeight: 18,
    },
    heroRight: { alignItems: "center", gap: 6, flexShrink: 0 },
    avatarRing: {
      width: 46,
      height: 46,
      borderRadius: 23,
      overflow: "hidden",
      padding: 2,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarImage: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.surfaceAlt,
    },
    avatarFallback: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
    avatarInitials: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.textPrimary,
    },
    creditsBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    creditsDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.onPrimary,
    },
    creditsText: { fontSize: 9, fontWeight: "700", color: theme.onPrimary },
  });
}
