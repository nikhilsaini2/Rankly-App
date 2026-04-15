import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
import { colors } from "../../../theme/color";

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
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={modalStyles.backdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          />

          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View
              style={[modalStyles.sheet, { paddingBottom: insets.bottom + 20 }]}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
              >
                <View style={modalStyles.handle} />

                <View style={modalStyles.headerRow}>
                  <View style={modalStyles.headerIcon}>
                    <LinearGradient
                      colors={["rgba(108,99,255,0.2)", "rgba(108,99,255,0.08)"]}
                      style={{ borderRadius: 12 } as StyleProp<ViewStyle>}
                    />
                    <Ionicons name="flash" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.title}>Analyze resume</Text>
                    <Text style={modalStyles.subtitle}>
                      Add a job description for a tailored score
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={modalStyles.closeBtn}
                    onPress={onClose}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={modalStyles.inputWrap}>
                  <View style={modalStyles.inputLabelRow}>
                    <Ionicons
                      name="briefcase-outline"
                      size={13}
                      color={colors.textMuted}
                    />
                    <Text style={modalStyles.inputLabel}>
                      Job description{" "}
                      <Text style={modalStyles.inputLabelOpt}>(optional)</Text>
                    </Text>
                  </View>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Paste the job description here for a more accurate keyword and relevance score…"
                    placeholderTextColor={colors.placeholder}
                    value={jobDescription}
                    onChangeText={onChangeText}
                    multiline
                    numberOfLines={5}
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                <View style={modalStyles.tipRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={13}
                    color={colors.accent}
                  />
                  <Text style={modalStyles.tipText}>
                    Without a job description, you'll get a general ATS score
                  </Text>
                </View>

                <PressableScale onPress={onAnalyze} style={modalStyles.cta}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={modalStyles.ctaInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="flash" size={16} color="#fff" />
                    <Text style={modalStyles.ctaText}>Run ATS Analysis</Text>
                  </LinearGradient>
                </PressableScale>
              </ScrollView>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 4,
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
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  inputLabelOpt: {
    color: colors.textMuted,
    fontWeight: "400",
  },
  input: {
    minHeight: 110,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
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
    color: colors.accent,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  cta: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  ctaInner: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
