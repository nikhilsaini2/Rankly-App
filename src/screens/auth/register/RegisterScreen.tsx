import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Formik } from "formik";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
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
import { roles } from "../../../constants/all";
import {
  getAuthSessionUser,
  handleUserProfile,
  registerUser,
  signInWithGoogle,
} from "../../../services/supabase/auth.supabase";
import { useAppTheme } from "../../../theme/useAppTheme";
import type { AuthScreenProps } from "../../../types/navigation.types";
import { getGoogleAuthErrorMessage } from "../../../utils/googleAuthError";
import { sanitizeFirstName, sanitizeLastName } from "../../../utils/nameValidation";
import { RegisterSchema } from "../../../validation/auth.schema";
import { createRegisterStyles } from "./styles";

import { KeyboardAwareScreenScroll } from "../../../components/layouts/KeyboardAwareScreenScroll";

const RegisterScreen = ({ navigation }: AuthScreenProps<"Register">) => {
  const theme = useAppTheme();
  const styles = createRegisterStyles(theme);
  const insets = useSafeAreaInsets();
  const isLight = theme.background === "#F3F4F8";
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState("");

  useEffect(() => {
    // Intentionally removed: calling getAuthSessionUser on mount caused
    // premature navigation before the user completed registration.
    // RootNavigator's onAuthStateChange handles all session-driven navigation.
  }, []);

  const waitForSession = async (retries = 6) => {
    for (let i = 0; i < retries; i++) {
      const user = await getAuthSessionUser();
      if (user) return user;
      await new Promise((res) => setTimeout(res, 400));
    }
    throw new Error("Session not established");
  };

  const handleGoogleLogin = useCallback(async () => {
    try {
      setGoogleLoading(true);
      setGlobalError(null);
      await signInWithGoogle();
      const user = await waitForSession();
      await handleUserProfile(user);
      // Navigation driven by onAuthStateChange — keep googleLoading until transition
    } catch (err) {
      setGlobalError(getGoogleAuthErrorMessage(err));
      setGoogleLoading(false);
    }
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const scrollRef = useRef<ScrollView | null>(null);

  const scrollBottomPad =
    16 +
    (Platform.OS === "android" ? Math.max(0, 16 - insets.bottom) : 0);

  // FIX: No early return with full-screen loader — that causes flicker by
  // unmounting the form. Loading state is shown inside the CTA button instead.
  // RootNavigator's onAuthStateChange drives the navigation atomically.

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isLight ? "#F5F6FA" : theme.bgPrimary }}
      edges={["bottom", "left", "right"]}
    >
      <StatusBar style={isLight ? "dark" : "light"} />
      <View style={styles.container}>
        <KeyboardAwareScreenScroll
          ref={scrollRef}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: scrollBottomPad,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
            <View style={styles.header}>
              <AppName size={26} />
            </View>

            <View style={{ flexShrink: 1, paddingHorizontal: 16 }}>
                <View style={styles.titleWrap}>
                  <Text style={styles.title}>Create Profile</Text>
                </View>

                <Formik
                  initialValues={{
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    confirmPassword: "",
                    role: roles[0],
                  }}
                  validationSchema={RegisterSchema}
                  validateOnChange
                  validateOnBlur
                  onSubmit={async (values, { setSubmitting }) => {
                    try {
                      setLoading(true);
                      setGlobalError(null);
                      // Derive final role — never store "Other" as the value
                      const finalRole = values.role === "Other" || values.role.trim() === ""
                        ? customRole.trim()
                        : values.role;
                      if (!finalRole || finalRole.length < 2) {
                        setGlobalError("Please enter a valid target role.");
                        setLoading(false);
                        setSubmitting(false);
                        return;
                      }
                      await registerUser({
                        email: values.email.trim(),
                        password: values.password,
                        firstName: values.firstName.trim(),
                        lastName: values.lastName.trim(),
                        role: finalRole,
                      });
                      // Navigation driven by onAuthStateChange — keep spinner until transition
                    } catch (err) {
                      setLoading(false);
                      setSubmitting(false);
                      const message =
                        err instanceof Error
                          ? err.message
                          : typeof err === "object" &&
                              err !== null &&
                              "message" in err
                            ? String(
                                (err as { message?: unknown }).message ?? "",
                              )
                            : "";
                      setGlobalError(
                        "Registration failed: " + (message || "Unknown error"),
                      );
                    }
                  }}
                >
                  {({
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    values,
                    errors,
                    touched,
                    setFieldValue,
                    setFieldTouched,
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

                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>FIRST NAME <Text style={{ color: "red" }}>*</Text></Text>
                          <TextInput
                            ref={firstNameRef}
                            style={[
                              styles.input,
                              touched.firstName &&
                                errors.firstName &&
                                styles.inputError,
                            ]}
                            placeholder="Rahul"
                            placeholderTextColor={theme.placeholder}
                            value={values.firstName}
                            onChangeText={(text) =>
                              handleChange("firstName")(sanitizeFirstName(text))
                            }
                            onBlur={handleBlur("firstName")}
                            returnKeyType="next"
                            textContentType="givenName"
                            accessibilityLabel="First name input"
                            accessibilityHint="Enter your first name"
                            onSubmitEditing={() => lastNameRef.current?.focus()}
                            autoComplete="off"
                          />
                          {touched.firstName && errors.firstName && (
                            <Text style={styles.error}>{errors.firstName}</Text>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>LAST NAME <Text style={{ color: "red" }}>*</Text></Text>
                          <TextInput
                            ref={lastNameRef}
                            style={[
                              styles.input,
                              touched.lastName &&
                                errors.lastName &&
                                styles.inputError,
                            ]}
                            placeholder="Singh"
                            placeholderTextColor={theme.placeholder}
                            value={values.lastName}
                            onChangeText={(text) =>
                              handleChange("lastName")(sanitizeLastName(text))
                            }
                            onBlur={handleBlur("lastName")}
                            returnKeyType="next"
                            textContentType="familyName"
                            accessibilityLabel="Last name input"
                            accessibilityHint="Enter your last name"
                            onSubmitEditing={() => emailRef.current?.focus()}
                            autoComplete="off"
                          />
                          {touched.lastName && errors.lastName && (
                            <Text style={styles.error}>{errors.lastName}</Text>
                          )}
                        </View>
                      </View>

                      <View>
                        <Text style={styles.label}>EMAIL ADDRESS <Text style={{ color: "red" }}>*</Text></Text>
                        <TextInput
                          ref={emailRef}
                          style={[
                            styles.input,
                            touched.email && errors.email && styles.inputError,
                          ]}
                          placeholder="Enter Email"
                          placeholderTextColor={theme.placeholder}
                          value={values.email}
                          onChangeText={(text) => handleChange("email")(text.trimStart())}
                          onBlur={() => {
                            setFieldTouched("email", true, true);
                            setFieldValue("email", values.email.trim());
                          }}
                          returnKeyType="next"
                          textContentType="emailAddress"
                          accessibilityLabel="Email address input"
                          accessibilityHint="Enter your email address"
                          autoCorrect={false}
                          onSubmitEditing={() => passwordRef.current?.focus()}
                          autoComplete="off"
                        />
                        {touched.email && errors.email && (
                          <Text style={styles.error}>{errors.email}</Text>
                        )}
                      </View>

                      <View>
                        <Text style={styles.label}>PASSWORD <Text style={{ color: "red" }}>*</Text></Text>
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
                            placeholderTextColor={theme.placeholder}
                            secureTextEntry={!showPassword}
                            value={values.password}
                            onChangeText={handleChange("password")}
                            onBlur={handleBlur("password")}
                            returnKeyType="next"
                            textContentType="password"
                            accessibilityLabel="Password input"
                            accessibilityHint="Enter your password"
                            autoCorrect={false}
                            onSubmitEditing={() =>
                              confirmPasswordRef.current?.focus()
                            }
                            autoComplete="off"
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
                              color={theme.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.password && errors.password && (
                          <Text style={styles.error}>{errors.password}</Text>
                        )}
                      </View>

                      <View>
                        <Text style={styles.label}>CONFIRM PASSWORD <Text style={{ color: "red" }}>*</Text></Text>
                        <View style={styles.inputRow}>
                          <TextInput
                            ref={confirmPasswordRef}
                            style={[
                              styles.input,
                              { flex: 1 },
                              touched.confirmPassword &&
                                errors.confirmPassword &&
                                styles.inputError,
                            ]}
                            placeholder="Confirm your password"
                            placeholderTextColor={theme.placeholder}
                            secureTextEntry={!showConfirmPassword}
                            value={values.confirmPassword}
                            onChangeText={handleChange("confirmPassword")}
                            onBlur={handleBlur("confirmPassword")}
                            returnKeyType="done"
                            textContentType="password"
                            accessibilityLabel="Confirm password input"
                            accessibilityHint="Confirm your password"
                            autoCorrect={false}
                            onSubmitEditing={Keyboard.dismiss}
                            autoComplete="off"
                          />
                          <TouchableOpacity
                            onPress={toggleConfirmPasswordVisibility}
                            style={styles.passwordToggle}
                            accessibilityLabel={
                              showConfirmPassword
                                ? "Hide confirm password"
                                : "Show confirm password"
                            }
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name={showConfirmPassword ? "eye" : "eye-off"}
                              size={20}
                              color={theme.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.confirmPassword && errors.confirmPassword && (
                          <Text style={styles.error}>
                            {errors.confirmPassword}
                          </Text>
                        )}
                      </View>

                      <Text style={styles.label}>TARGET ROLE <Text style={{ color: "red" }}>*</Text></Text>
                      <View style={styles.roles}>
                        {roles.map((role) => {
                          const isOtherChip = role === "Other";
                          const predefined = roles.slice(0, -1); // all except "Other"
                          const active = isOtherChip
                            ? !predefined.includes(values.role)
                            : role === values.role;
                          return (
                            <TouchableOpacity
                              key={role}
                              onPress={() => {
                                if (isOtherChip) {
                                  // Switch to Other — set role to customRole if already typed, else empty
                                  setFieldValue("role", customRole.trim() || "Other");
                                } else {
                                  setCustomRole("");
                                  setFieldValue("role", role);
                                }
                              }}
                              style={[
                                styles.roleChip,
                                active && styles.roleChipActive,
                              ]}
                              accessibilityLabel={`Select role: ${role}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: active }}
                            >
                              <Text
                                style={[
                                  styles.roleText,
                                  active && styles.roleTextActive,
                                ]}
                              >
                                {role}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {/* Custom role input — shown when Other is selected */}
                      {!roles.slice(0, -1).includes(values.role) && (
                        <TextInput
                          style={[styles.input, { marginTop: 8 }]}
                          placeholder="Enter your target role"
                          placeholderTextColor={theme.placeholder}
                          value={customRole}
                          onChangeText={(text) => {
                            setCustomRole(text);
                            setFieldValue("role", text.trim() || "Other");
                          }}
                          onFocus={() => {
                            setTimeout(() => {
                              scrollRef.current?.scrollToEnd({ animated: true });
                            }, 150);
                          }}
                          autoCapitalize="words"
                          returnKeyType="done"
                          accessibilityLabel="Custom role input"
                        />
                      )}

                      <TouchableOpacity
                        onPress={() => { Keyboard.dismiss(); handleSubmit(); }}
                        disabled={!(isValid && dirty) || loading || googleLoading}
                        activeOpacity={0.9}
                        accessibilityLabel="Create account button"
                        accessibilityRole="button"
                        accessibilityHint={
                          !isValid || !dirty
                            ? "Fill in all fields to create account"
                            : "Create your Rankly account"
                        }
                      >
                        <LinearGradient
                          colors={[theme.primary, theme.primaryDark]}
                          style={[
                            styles.cta,
                            { opacity: isValid && dirty ? 1 : 0.5 },
                          ]}
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color="#FAF9FF" />
                          ) : (
                            <>
                              <Text style={styles.ctaText}>Launch Rankly </Text>
                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color="white"
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
                        disabled={googleLoading}
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
                            <ActivityIndicator size="small" color={isLight ? "#000" : "white"} />
                            <Text style={styles.googleText}>Signing in...</Text>
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
                        onPress={() => navigation.replace("Login")}
                        accessibilityLabel="Go to login"
                        accessibilityRole="button"
                      >
                        <Text
                          style={{
                            color: theme.inputLabel,
                            textAlign: "center",
                            marginTop: 12,
                          }}
                        >
                          Already have an account?{" "}
                          <Text style={{ color: theme.secondary }}>Login</Text>
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Formik>
            </View>
        </KeyboardAwareScreenScroll>
      </View>
    </SafeAreaView>
  );
};

export default RegisterScreen;
