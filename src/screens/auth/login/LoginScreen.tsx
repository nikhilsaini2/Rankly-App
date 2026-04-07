import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Formik } from "formik";
import React, { useRef, useState } from "react";
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
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AppName from "../../../components/atoms/AppName";
import { colors } from "../../../theme/color";
import { loginSchema } from "../../../validation/auth.schema";
import { styles } from "./styles";

import {
  handleUserProfile,
  signInWithEmailPassword,
  signInWithGoogle,
} from "../../../services/supabase/auth.supabase";
import type { AuthScreenProps } from "../../../types/navigation.types";

const LoginScreen = ({ navigation }: AuthScreenProps<"Login">) => {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (values: {
    email: string;
    password: string;
  }) => {
    try {
      setLoading(true);
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
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setLoading(true);
      const user = await signInWithGoogle();
      await handleUserProfile(user);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message ?? "")
            : "Login failed";
      alert(message);
    } finally {
      setGoogleLoading(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{ color: "white", fontSize: 18, marginTop: 15, marginLeft: 3 }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 50}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <LinearGradient
            colors={[colors.primary, "transparent"]}
            style={styles.bgGlow}
          />

          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
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
                    <View>
                      <Text style={styles.label}>EMAIL ADDRESS</Text>
                      <TextInput
                        ref={emailRef}
                        style={styles.input}
                        placeholder="rahul@gmail.com"
                        placeholderTextColor={colors.textMuted}
                        value={values.email}
                        onChangeText={handleChange("email")}
                        onBlur={handleBlur("email")}
                        returnKeyType="next"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
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
                          style={[styles.input, { flex: 1 }]}
                          placeholder="•••••••••"
                          placeholderTextColor={colors.textMuted}
                          secureTextEntry
                          value={values.password}
                          onChangeText={handleChange("password")}
                          onBlur={handleBlur("password")}
                          returnKeyType="done"
                          autoCapitalize="none"
                          autoCorrect={false}
                          onSubmitEditing={Keyboard.dismiss}
                        />
                      </View>
                      {touched.password && errors.password && (
                        <Text style={styles.error}>{errors.password}</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => handleSubmit()}
                      disabled={!isValid || !dirty || loading}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={[colors.secondary, colors.secondaryDark]}
                        style={[
                          styles.cta,
                          { opacity: isValid && dirty ? 1 : 0.5 },
                        ]}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="white" />
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
                    >
                      <Text
                        style={{
                          color: colors.textMuted,
                          textAlign: "center",
                          marginTop: 12,
                        }}
                      >
                        Don't have an account?{" "}
                        <Text style={{ color: colors.secondary }}>
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
