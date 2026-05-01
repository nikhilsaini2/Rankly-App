import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  const [state, setState] = useState<{
    message: string;
    variant: ToastVariant;
  } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  function show(message: string, variant: ToastVariant = "info") {
    if (hideRef.current) clearTimeout(hideRef.current);
    setState({ message, variant });
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(2600),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
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
              borderLeftColor: borderColor,
            },
          ]}
        >
          <Text style={styles.text}>{state.message}</Text>
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
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      zIndex: 9999,
      ...elevation.raised,
    },
    text: { color: theme.textPrimary, textAlign: "center", fontWeight: "600" },
  });
}

