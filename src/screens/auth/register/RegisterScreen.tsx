import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Formik } from "formik";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { roles } from "../../../constants/all";
import {
  getAuthSessionUser,
  handleUserProfile,
  registerUser,
  signInWithGoogle,
} from "../../../services/supabase/auth.supabase";
import { colors } from "../../../theme/color";
import type { AuthScreenProps } from "../../../types/navigation.types";
import { RegisterSchema } from "../../../validation/auth.schema";
import { styles } from "./styles";

const RegisterScreen = ({ navigation }: AuthScreenProps<"Register">) => {
  const insets = useSafeAreaInsets();
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
    getAuthSessionUser()
      .then(async (user) => {
        if (user) await handleUserProfile(user);
      })
      .catch(() => {});
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
      setLoading(true);
      setGlobalError(null);
      await signInWithGoogle();
      const user = await waitForSession();
      await handleUserProfile(user);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message ?? "")
            : "";
      setGlobalError("Google sign-in failed: " + (message || "Unknown error"));
    } finally {
      setGoogleLoading(false);
      setLoading(false);
    }
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
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
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 30}
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
                    } finally {
                      setLoading(false);
                      setSubmitting(false);
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
                          <Text style={styles.label}>FIRST NAME</Text>
                          <TextInput
                            ref={firstNameRef}
                            style={[
                              styles.input,
                              touched.firstName &&
                                errors.firstName &&
                                styles.inputError,
                            ]}
                            placeholder="Rahul"
                            placeholderTextColor={colors.placeholder}
                            value={values.firstName}
                            onChangeText={handleChange("firstName")}
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
                          <Text style={styles.label}>LAST NAME</Text>
                          <TextInput
                            ref={lastNameRef}
                            style={[
                              styles.input,
                              touched.lastName &&
                                errors.lastName &&
                                styles.inputError,
                            ]}
                            placeholder="Singh"
                            placeholderTextColor={colors.placeholder}
                            value={values.lastName}
                            onChangeText={handleChange("lastName")}
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
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.password && errors.password && (
                          <Text style={styles.error}>{errors.password}</Text>
                        )}
                      </View>

                      <View>
                        <Text style={styles.label}>CONFIRM PASSWORD</Text>
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
                            placeholderTextColor={colors.placeholder}
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
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.confirmPassword && errors.confirmPassword && (
                          <Text style={styles.error}>
                            {errors.confirmPassword}
                          </Text>
                        )}
                      </View>

                      <Text style={styles.label}>TARGET ROLE</Text>
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
                          placeholderTextColor={colors.placeholder}
                          value={customRole}
                          onChangeText={(text) => {
                            setCustomRole(text);
                            setFieldValue("role", text.trim() || "Other");
                          }}
                          autoCapitalize="words"
                          returnKeyType="done"
                          accessibilityLabel="Custom role input"
                        />
                      )}

                      <TouchableOpacity
                        onPress={() => handleSubmit()}
                        disabled={!(isValid && dirty) || loading}
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
                            color: colors.inputLabel,
                            textAlign: "center",
                            marginTop: 12,
                          }}
                        >
                          Already have an account?{" "}
                          <Text style={{ color: colors.secondary }}>Login</Text>
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

export default RegisterScreen;
