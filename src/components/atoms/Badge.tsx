import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/color";

export const Badge = ({ label }: any) => {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.2)",
  },
  text: {
    color: colors.primaryLight,
    fontSize: 12,
  },
});
