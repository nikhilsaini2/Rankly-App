import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getElevation } from "../../theme";
import { useAppTheme } from "../../theme/useAppTheme";
import {
  registerGeminiToastListener,
  unregisterGeminiToastListener,
} from "../../utils/geminiToastBridge";

export type ToastVariant = "success" | "error" | "info";

type ToastFn = (message: string, variant?: ToastVariant) => void;
const ToastContext = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

function getToastLabel(variant: ToastVariant): string {
  if (variant === "success") return "Success";
  if (variant === "error") return "Failed";
  return "Info";
}

function getToastGlyph(variant: ToastVariant): string {
  if (variant === "success") return "✓";
  if (variant === "error") return "!";
  return "i";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  const [state, setState] = useState<{
    message: string;
    variant: ToastVariant;
  } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  function show(message: string, variant: ToastVariant = "info") {
    if (hideRef.current) clearTimeout(hideRef.current);
    setState({ message, variant });
    translateY.setValue(-8);
    opacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2400),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -6,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) setState(null);
    });
    hideRef.current = setTimeout(() => setState(null), 3000);
  }

  // Register this toast as the global Gemini error sink
  useEffect(() => {
    registerGeminiToastListener((msg, variant) => show(msg, variant));
    return () => unregisterGeminiToastListener();
  }, []);

  const borderColor =
    state?.variant === "success"
      ? theme.accent
      : state?.variant === "error"
        ? theme.danger
        : theme.primary;

  const styles = createStyles(theme);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {state ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.banner,
            {
              opacity,
              top: insets.top + 8,
              borderColor,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.row}>
            <View style={[styles.glyphWrap, { borderColor }]}>
              <Text style={styles.glyph}>{getToastGlyph(state.variant)}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>{getToastLabel(state.variant)}</Text>
              <Text style={styles.text}>{state.message}</Text>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const elevation = getElevation(theme);

  return StyleSheet.create({
    banner: {
      position: "absolute",
      left: 20,
      right: 20,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: "rgba(10, 12, 16, 0.92)",
      borderWidth: 1,
      zIndex: 9999,
      ...elevation.raised,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    glyphWrap: {
      width: 28,
      height: 28,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.06)",
      flexShrink: 0,
    },
    glyph: {
      color: "rgba(255,255,255,0.92)",
      fontWeight: "900",
      fontSize: 14,
      marginTop: -1,
    },
    content: { flex: 1, gap: 2 },
    label: {
      color: "rgba(255,255,255,0.92)",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    text: {
      color: "rgba(255,255,255,0.86)",
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
  });
}

