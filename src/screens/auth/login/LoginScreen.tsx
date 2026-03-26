import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Formik } from "formik";
import React, { useRef } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";

import AppName from "../../../components/atoms/AppName";
import { colors } from "../../../theme/color";
import { loginSchema } from "../../../validation/auth.schema";
import { styles } from "./styles";

const LoginScreen = ({ navigation }: any) => {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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
          <Text style={styles.title}>Welcome Back</Text>
        </View>

        <Formik
          initialValues={{
            email: "",
            password: "",
          }}
          validationSchema={loginSchema}
          validateOnMount={true}
          onSubmit={(values) => {
            console.log(values);
          }}
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
              {/* EMAIL */}
              <View>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  ref={emailRef}
                  placeholder="rahul@gmail.com"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={values.email}
                  onChangeText={handleChange("email")}
                  onBlur={handleBlur("email")}
                  returnKeyType="next"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                {touched.email && errors.email && (
                  <Text style={styles.error}>{errors.email}</Text>
                )}
              </View>

              {/* PASSWORD */}
              <View>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    ref={passwordRef}
                    placeholder="•••••••••"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { flex: 1 }]}
                    secureTextEntry
                    value={values.password}
                    onChangeText={handleChange("password")}
                    onBlur={handleBlur("password")}
                    returnKeyType="done"
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                  />
                </View>
                {touched.password && errors.password && (
                  <Text style={styles.error}>{errors.password}</Text>
                )}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={handleSubmit as any}
                disabled={!isValid || !dirty}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.secondary, colors.secondaryDark]}
                  style={[styles.cta, { opacity: isValid && dirty ? 1 : 0.5 }]}
                >
                  <Text style={styles.ctaText}>Login </Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              {/* DIVIDER */}
              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.line} />
              </View>

              {/* GOOGLE */}
              <TouchableOpacity style={styles.googleBtn}>
                <Image
                  source={require("../../../../assets/images/google.png")}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* NAV */}
              <TouchableOpacity onPress={() => navigation.replace("Register")}>
                <Text
                  style={{
                    color: colors.textMuted,
                    textAlign: "center",
                    marginTop: 12,
                  }}
                >
                  Don’t have an account?{" "}
                  <Text style={{ color: colors.secondary }}>Register</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Formik>
      </View>
    </View>
  );
};

export default LoginScreen;
