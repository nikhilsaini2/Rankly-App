import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";

type CardProps = {
  children: ReactNode;
};

export const Card = ({ children }: CardProps) => {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return <View style={styles.card}>{children}</View>;
};

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.glass,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
  });
}
