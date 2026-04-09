import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

// PRODUCTION CHECKLIST:
// SafeArea + insets applied
// KeyboardAvoidingView + ScrollView
// Formik + Yup validation (not applicable - onboarding screen)
// Loading/error states
// Accessibility labels + textContentType
// Platform-specific bottom padding
// Input focus chain (returnKeyType + refs) (not applicable - no inputs)
// StatusBar configured

const OnBoardingScreen = ({ navigation }: AuthScreenProps<"Onboarding">) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = useCallback(async () => {
    try {
      setIsLoading(true);
      // Simulate async operation if needed
      await new Promise((resolve) => setTimeout(resolve, 100));
      navigation.replace("Register");
    } catch (error) {
      // Handle navigation error gracefully
      console.error("Navigation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      // Simulate async operation if needed
      await new Promise((resolve) => setTimeout(resolve, 100));
      navigation.replace("Login");
    } catch (error) {
      // Handle navigation error gracefully
      console.error("Navigation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  const bottomPadding =
    Platform.OS === "android" ? Math.max(insets.bottom, 16) : insets.bottom;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: bottomPadding + 50,
          }}
        >
          <View style={styles.header}>
            <AppName size={30} />
          </View>

          <View style={styles.cardWrapper}>
            <LinearGradient
              colors={["rgba(20,15,40,0.95)", "rgba(10,10,30,0.95)"]}
              style={styles.card}
            >
              <View style={styles.scoreRow}>
                <View style={styles.ringOuter}>
                  <ProgressRing progress={82} />
                </View>
                <View>
                  <Text style={styles.title}>Resume Score</Text>
                  <Text style={styles.meta}>SWE · Google · L4</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>+19 pts gained</Text>
                  </View>
                </View>
              </View>

              {BARS.map((item) => (
                <View key={item.label} style={styles.barRow}>
                  <Text style={styles.barLabel}>{item.label}</Text>
                  <View style={styles.barTrack}>
                    <LinearGradient
                      colors={item.colors}
                      style={[styles.barFill, { width: `${item.value}%` }]}
                    />
                  </View>
                  <Text style={styles.barValue}>{item.value}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureItem}>
                <View style={[styles.iconBox, { borderColor: f.color + "40" }]}>
                  <Ionicons name={f.icon} size={18} color={f.color} />
                </View>
                <View>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureSub}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.85}
            disabled={isLoading}
            accessibilityLabel="Get Started - Create a new account"
            accessibilityRole="button"
            style={[
              styles.ctaContainer,
              isLoading && { opacity: 0.6, pointerEvents: "none" as const },
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.cta}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.ctaText}>Loading...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.ctaText}>Get Started - </Text>
                  <Text style={styles.ctaText}>it's free </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ghostBtn}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityLabel="I already have an account - Go to login"
            accessibilityRole="button"
          >
            <Text style={styles.ghostText}>I already have an account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OnBoardingScreen;
