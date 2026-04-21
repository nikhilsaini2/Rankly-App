import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { useAppTheme } from "../../../theme/useAppTheme";

type Props = {
  visible: boolean;
  scoring: boolean;
  jobDescription: string;
  onChangeText: (text: string) => void;
  onAnalyze: () => void;
  onClose: () => void;
};

export function AnalyzeModal({
  visible,
  scoring,
  jobDescription,
  onChangeText,
  onAnalyze,
  onClose,
}: Props) {
  const theme = useAppTheme();
  const modalStyles = createStyles(theme);
  const insets = useSafeAreaInsets();

  // Animate the sheet upward when keyboard appears
  const sheetBottom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      Animated.timing(sheetBottom, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: KeyboardEvent) => {
      Animated.timing(sheetBottom, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [sheetBottom]);

  useEffect(() => {
    if (!visible) {
      sheetBottom.setValue(0);
    }
  }, [visible, sheetBottom]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => { Keyboard.dismiss(); onClose(); }}
        />

        <Animated.View style={{ marginBottom: sheetBottom }}>
          <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>

            <View style={modalStyles.handle} />

            <View style={modalStyles.headerRow}>
              <View style={modalStyles.headerIcon}>
                <LinearGradient
                  colors={["rgba(108,99,255,0.2)", "rgba(108,99,255,0.08)"]}
                  style={{ borderRadius: 12 } as StyleProp<ViewStyle>}
                />
                <Ionicons name="flash" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.title}>Analyze resume</Text>
                <Text style={modalStyles.subtitle}>
                  Add a job description for a tailored score
                </Text>
              </View>
              <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.inputWrap}>
              <View style={modalStyles.inputLabelRow}>
                <Ionicons name="briefcase-outline" size={13} color={theme.textMuted} />
                <Text style={modalStyles.inputLabel}>
                  Job description{" "}
                  <Text style={modalStyles.inputLabelOpt}>(optional)</Text>
                </Text>
              </View>
              <TextInput
                style={modalStyles.input}
                placeholder="Paste the job description here for a more accurate keyword and relevance score…"
                placeholderTextColor={theme.placeholder}
                value={jobDescription}
                onChangeText={onChangeText}
                multiline
                numberOfLines={4}
                blurOnSubmit={false}
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={modalStyles.tipRow}>
              <Ionicons name="information-circle-outline" size={13} color={theme.accent} />
              <Text style={modalStyles.tipText}>
                Without a job description, you'll get a general ATS score
              </Text>
            </View>

            <PressableScale onPress={onAnalyze} style={modalStyles.cta}>
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                style={modalStyles.ctaInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="flash" size={16} color={theme.onPrimary} />
                <Text style={modalStyles.ctaText}>Run ATS Analysis</Text>
              </LinearGradient>
            </PressableScale>

          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderBottomWidth: 0,
      gap: 14,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: "center",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(108,99,255,0.2)",
      overflow: "hidden",
    },
    title: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 12,
      marginTop: 1,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputWrap: {
      gap: 8,
    },
    inputLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    inputLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.3,
    },
    inputLabelOpt: {
      color: theme.textMuted,
      fontWeight: "400",
    },
    input: {
      height: 90,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.textPrimary,
      textAlignVertical: "top",
      fontSize: 14,
      lineHeight: 20,
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(0,212,170,0.06)",
      borderWidth: 1,
      borderColor: "rgba(0,212,170,0.15)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tipText: {
      color: theme.accent,
      fontSize: 11,
      flex: 1,
      lineHeight: 16,
    },
    cta: {
      borderRadius: 14,
      overflow: "hidden",
    },
    ctaInner: {
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    ctaText: {
      color: theme.onPrimary,
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
  });
}
