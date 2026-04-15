import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Formik } from "formik";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AppName from "../../../components/atoms/AppName";
import {
  handleUserProfile,
  signInWithEmailPassword,
  signInWithGoogle,
} from "../../../services/supabase/auth.supabase";
import { colors } from "../../../theme/color";
import type { AuthScreenProps } from "../../../types/navigation.types";
import { loginSchema } from "../../../validation/auth.schema";
import { styles } from "./styles";

const LoginScreen = ({ navigation }: AuthScreenProps<"Login">) => {
  const insets = useSafeAreaInsets();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleEmailLogin = useCallback(
    async (values: { email: string; password: string }) => {
      try {
        setLoading(true);
        setGlobalError(null);
        const user = await signInWithEmailPassword(
          values.email.trim(),
          values.password,
        );
        await handleUserProfile(user);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message?: unknown }).message ?? "")
              : "Login failed";
        setGlobalError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleGoogleLogin = useCallback(async () => {
    try {
      setGoogleLoading(true);
      setLoading(true);
      setGlobalError(null);
      const user = await signInWithGoogle();
      await handleUserProfile(user);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message ?? "")
            : "Login failed";
      setGlobalError(message);
    } finally {
      setGoogleLoading(false);
      setLoading(false);
    }
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const bottomPadding =
    Platform.OS === "android" ? Math.max(insets.bottom, 16) : insets.bottom;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
        <StatusBar style="light" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.bgPrimary,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={{ color: colors.textPrimary, fontSize: 18, marginTop: 15 }}
          >
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.container}>
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: bottomPadding + 50,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.header}>
                <AppName size={30} />
              </View>

              <View style={styles.scroll}>
                <View style={styles.titleWrap}>
                  <Text style={styles.title}>Welcome Back</Text>
                </View>

                <Formik
                  initialValues={{ email: "", password: "" }}
                  validationSchema={loginSchema}
                  validateOnMount
                  onSubmit={handleEmailLogin}
                >
                  {({
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    values,
                    errors,
                    touched,
                    isValid,
                    dirty,
                  }) => (
                    <View style={styles.card}>
                      {globalError && (
                        <View style={styles.errorBanner}>
                          <Text style={styles.errorBannerText}>
                            {globalError}
                          </Text>
                        </View>
                      )}

                      <View>
                        <Text style={styles.label}>EMAIL ADDRESS</Text>
                        <TextInput
                          ref={emailRef}
                          style={[
                            styles.input,
                            touched.email && errors.email && styles.inputError,
                          ]}
                          placeholder="Enter Email"
                          placeholderTextColor={colors.placeholder}
                          value={values.email}
                          onChangeText={handleChange("email")}
                          onBlur={handleBlur("email")}
                          returnKeyType="next"
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoComplete="off"
                          textContentType="emailAddress"
                          accessibilityLabel="Email address input"
                          accessibilityHint="Enter your email address"
                          onSubmitEditing={() => passwordRef.current?.focus()}
                        />
                        {touched.email && errors.email && (
                          <Text style={styles.error}>{errors.email}</Text>
                        )}
                      </View>

                      <View>
                        <Text style={styles.label}>PASSWORD</Text>
                        <View style={styles.inputRow}>
                          <TextInput
                            ref={passwordRef}
                            style={[
                              styles.input,
                              { flex: 1 },
                              touched.password &&
                                errors.password &&
                                styles.inputError,
                            ]}
                            placeholder="Enter your password"
                            placeholderTextColor={colors.placeholder}
                            secureTextEntry={!showPassword}
                            value={values.password}
                            onChangeText={handleChange("password")}
                            onBlur={handleBlur("password")}
                            returnKeyType="done"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            textContentType="password"
                            accessibilityLabel="Password input"
                            accessibilityHint="Enter your password"
                            onSubmitEditing={Keyboard.dismiss}
                          />
                          <TouchableOpacity
                            onPress={togglePasswordVisibility}
                            style={styles.passwordToggle}
                            accessibilityLabel={
                              showPassword ? "Hide password" : "Show password"
                            }
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name={showPassword ? "eye" : "eye-off"}
                              size={20}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.password && errors.password && (
                          <Text style={styles.error}>{errors.password}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={() => handleSubmit()}
                        disabled={!isValid || !dirty || loading}
                        activeOpacity={0.9}
                        accessibilityLabel="Login button"
                        accessibilityRole="button"
                        accessibilityHint={
                          !isValid || !dirty
                            ? "Fill in all fields to enable login"
                            : "Sign in to your account"
                        }
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          style={[
                            styles.cta,
                            { opacity: isValid && dirty ? 1 : 0.5 },
                          ]}
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color="#FAF9FF" />
                          ) : (
                            <>
                              <Text style={styles.ctaText}>Login</Text>
                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color="#fff"
                              />
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>

                      <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.line} />
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.googleBtn,
                          { opacity: googleLoading ? 0.8 : 1 },
                        ]}
                        onPress={handleGoogleLogin}
                        disabled={googleLoading || loading}
                        activeOpacity={0.9}
                        accessibilityLabel="Continue with Google"
                        accessibilityRole="button"
                      >
                        {googleLoading ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <ActivityIndicator size="small" color="white" />
                            <Text style={styles.googleText}>Logging in...</Text>
                          </View>
                        ) : (
                          <>
                            <Image
                              source={require("../../../../assets/images/google.png")}
                              style={styles.googleIcon}
                            />
                            <Text style={styles.googleText}>
                              Continue with Google
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => navigation.replace("Register")}
                        accessibilityLabel="Go to registration"
                        accessibilityRole="button"
                      >
                        <Text
                          style={{
                            color: colors.textMuted,
                            textAlign: "center",
                            marginTop: 12,
                          }}
                        >
                          Don't have an account?{" "}
                          <Text style={{ color: colors.inputLabel }}>
                            Register
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Formik>
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
