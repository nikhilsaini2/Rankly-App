import { StyleSheet, View } from "react-native";

export const Skeleton = () => {
  return <View style={styles.skeleton} />;
};

const styles = StyleSheet.create({
  skeleton: {
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
});
