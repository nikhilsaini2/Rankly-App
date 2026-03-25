import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/color";

export const Card = ({ children }: any) => {
  return <View style={styles.card}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
