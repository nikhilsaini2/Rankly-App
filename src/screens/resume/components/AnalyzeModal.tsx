import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { colors } from "../../../theme/color";
import { styles } from "../styles";

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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Analyze resume</Text>
          <Text style={styles.modalSub}>
            Job description (optional — for better accuracy)
          </Text>
          <TextInput
            style={styles.jdInput}
            placeholder="Paste job description…"
            placeholderTextColor={colors.textMuted}
            value={jobDescription}
            onChangeText={onChangeText}
            multiline
          />
          <PressableScale
            onPress={onAnalyze}
            disabled={scoring}
            style={{ marginTop: 16 }}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.modalCta}
            >
              {scoring ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.modalCtaTxt}>Analyze Resume</Text>
              )}
            </LinearGradient>
          </PressableScale>
          <TouchableOpacity style={{ marginTop: 12 }} onPress={onClose}>
            <Text style={{ color: colors.textMuted, textAlign: "center" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
