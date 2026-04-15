import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AppName from "../../../components/atoms/AppName";
import ProgressRing from "../../../components/atoms/ProgressRing";
import { BARS, FEATURES } from "../../../constants/all";
import { colors } from "../../../theme/color";
import type { AuthScreenProps } from "../../../types/navigation.types";
import { styles } from "./styles";

const OnBoardingScreen = ({ navigation }: AuthScreenProps<"Onboarding">) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = useCallback(async () => {
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      navigation.replace("Register");
    } catch (error) {
      console.error("Navigation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      navigation.replace("Login");
    } catch (error) {
      console.error("Navigation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.container,
            {
              flex: 1,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: 16,
              justifyContent: "space-between",
            },
          ]}
        >
          <View style={styles.header}>
            <AppName size={26} />
          </View>

          <View style={styles.cardWrapper}>
            <LinearGradient
              colors={["rgba(20,15,40,0.95)", "rgba(10,10,30,0.95)"]}
              style={[
                styles.card,
                { paddingVertical: 12, paddingHorizontal: 14 },
              ]}
            >
              <View style={[styles.scoreRow, { marginBottom: 10 }]}>
                <View style={styles.ringOuter}>
                  <ProgressRing progress={82} size={56} />
                </View>
                <View>
                  <Text style={[styles.title, { fontSize: 14 }]}>
                    Resume Score
                  </Text>
                  <Text style={[styles.meta, { fontSize: 12 }]}>
                    SWE · Google · L4
                  </Text>
                  <View style={styles.badge}>
                    <Text style={[styles.badgeText, { fontSize: 11 }]}>
                      +19 pts gained
                    </Text>
                  </View>
                </View>
              </View>

              {BARS.map((item) => (
                <View
                  key={item.label}
                  style={[styles.barRow, { marginBottom: 6 }]}
                >
                  <Text style={[styles.barLabel, { fontSize: 11 }]}>
                    {item.label}
                  </Text>
                  <View style={styles.barTrack}>
                    <LinearGradient
                      colors={item.colors}
                      style={[styles.barFill, { width: `${item.value}%` }]}
                    />
                  </View>
                  <Text style={[styles.barValue, { fontSize: 11 }]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </LinearGradient>
          </View>

          <View style={[styles.features, { gap: 8 }]}>
            {FEATURES.map((f) => (
              <View key={f.title} style={[styles.featureItem, { gap: 10 }]}>
                <View style={[styles.iconBox, { borderColor: f.color + "40" }]}>
                  <Ionicons name={f.icon} size={16} color={f.color} />
                </View>
                <View>
                  <Text style={[styles.featureTitle, { fontSize: 13 }]}>
                    {f.title}
                  </Text>
                  <Text style={[styles.featureSub, { fontSize: 11 }]}>
                    {f.sub}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={handleGetStarted}
              activeOpacity={0.85}
              disabled={isLoading}
              accessibilityLabel="Get Started - Create a new account"
              accessibilityRole="button"
              style={[styles.ctaContainer, isLoading && { opacity: 0.6 }]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={[styles.cta, { paddingVertical: 14 }]}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.ctaText}>Loading...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.ctaText}>Get Started - </Text>
                    <Text style={styles.ctaText}>it's free </Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.ghostBtn, { paddingVertical: 12 }]}
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityLabel="I already have an account - Go to login"
              accessibilityRole="button"
            >
              <Text style={styles.ghostText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OnBoardingScreen;
