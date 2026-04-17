import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";

type BadgeProps = {
  label: string;
};

export const Badge = ({ label }: BadgeProps) => {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(124,58,237,0.2)",
    },
    text: {
      color: theme.primaryLight,
      fontSize: 12,
    },
  });
}
