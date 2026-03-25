import { StyleSheet, TextInput } from "react-native";
import { colors } from "../../theme/color";

export const Input = (props: any) => {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={styles.input}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
