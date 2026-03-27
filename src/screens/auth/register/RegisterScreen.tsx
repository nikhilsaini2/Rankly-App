import { LinearGradient } from "expo-linear-gradient";
import { Formik } from "formik";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AppName from "../../../components/atoms/AppName";
import { roles } from "../../../constants/all";
import {
  handleUserProfile,
  registerUser,
  signInWithGoogle,
} from "../../../services/supabase/auth.supabase";
import { supabase } from "../../../services/supabase/supabase";
import { colors } from "../../../theme/color";
import { RegisterSchema } from "../../../validation/auth.schema";
import { styles } from "./styles";

const RegisterScreen = ({ navigation }: any) => {
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await handleUserProfile(data.session.user);
      }
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      const user = await signInWithGoogle();

      await handleUserProfile(user);
    } catch (err: any) {
      alert("Google sign-in failed: " + err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, "transparent"]}
        style={styles.bgGlow}
      />

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
              await registerUser({
                email: values.email,
                password: values.password,
                firstName: values.firstName,
                lastName: values.lastName,
                role: values.role,
              });
            } catch (err: any) {
              console.error("❌ Registration error:", err.message);
              setLoading(false);
              setSubmitting(false);
              alert("Registration failed: " + err.message);
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
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>FIRST NAME</Text>
                  <TextInput
                    ref={firstNameRef}
                    style={styles.input}
                    placeholder="Rahul"
                    placeholderTextColor={colors.textMuted}
                    value={values.firstName}
                    onChangeText={handleChange("firstName")}
                    onBlur={handleBlur("firstName")}
                    returnKeyType="next"
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
                    style={styles.input}
                    placeholder="Singh"
                    placeholderTextColor={colors.textMuted}
                    value={values.lastName}
                    onChangeText={handleChange("lastName")}
                    onBlur={handleBlur("lastName")}
                    returnKeyType="next"
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
                  style={styles.input}
                  placeholder="rahul@gmail.com"
                  placeholderTextColor={colors.textMuted}
                  value={values.email}
                  onChangeText={handleChange("email")}
                  onBlur={handleBlur("email")}
                  returnKeyType="next"
                  autoComplete="off"
                  autoCorrect={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                {touched.email && errors.email && (
                  <Text style={styles.error}>{errors.email}</Text>
                )}
              </View>

              <View>
                <Text style={styles.label}>Password</Text>
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
                    returnKeyType="next"
                    autoComplete="off"
                    autoCorrect={false}
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  />
                </View>
                {touched.password && errors.password && (
                  <Text style={styles.error}>{errors.password}</Text>
                )}
              </View>

              <View>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={[styles.input, { flex: 1 }]}
                    placeholder="•••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={values.confirmPassword}
                    onChangeText={handleChange("confirmPassword")}
                    onBlur={handleBlur("confirmPassword")}
                  />
                </View>
                {touched.confirmPassword && errors.confirmPassword && (
                  <Text style={styles.error}>{errors.confirmPassword}</Text>
                )}
              </View>

              <Text style={styles.label}>TARGET ROLE</Text>
              <View style={styles.roles}>
                {roles.map((role) => {
                  const active = role === values.role;
                  return (
                    <TouchableOpacity
                      key={role}
                      onPress={() => setFieldValue("role", role)}
                      style={[styles.roleChip, active && styles.roleChipActive]}
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

              <TouchableOpacity
                onPress={handleSubmit as any}
                disabled={!(isValid && dirty) || loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.secondary, colors.secondaryDark]}
                  style={[styles.cta, { opacity: isValid && dirty ? 1 : 0.5 }]}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                    </>
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Launch Rankly </Text>
                      <Ionicons name="arrow-forward" size={16} color="white" />
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
                style={[styles.googleBtn, { opacity: googleLoading ? 0.8 : 1 }]}
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
                    <Text style={styles.googleText}>Signing in...</Text>
                  </View>
                ) : (
                  <>
                    <Image
                      source={require("../../../../assets/images/google.png")}
                      style={styles.googleIcon}
                    />
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.replace("Login")}>
                <Text
                  style={{
                    color: colors.textMuted,
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
    </View>
  );
};

export default RegisterScreen;
