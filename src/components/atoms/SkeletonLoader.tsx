import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";

export const Skeleton = () => {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  return <View style={styles.skeleton} />;
};

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    skeleton: {
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.surfaceAlt,
    },
  });
