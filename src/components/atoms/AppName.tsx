import React from "react";
import { StyleSheet, Text, TextStyle, View } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";
import { typography } from "../../theme/typography";

type Props = {
  size?: number;
  style?: TextStyle;
};

const AppName = ({ size = 28, style }: Props) => {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.rank,
          {
            fontSize: size,
            lineHeight: size + 4,
          },
          style,
        ]}
      >
        Rank
      </Text>

      <Text
        style={[
          styles.ly,
          {
            fontSize: size,
            lineHeight: size + 4,
          },
        ]}
      >
        ly
      </Text>
    </View>
  );
};

export default AppName;

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const isLight = theme.background === "#F3F4F8";

  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
    },

    rank: {
      color: isLight ? theme.textPrimary : "#EDEDED",
      fontWeight: "700",
      letterSpacing: -0.2,

      fontFamily: typography.fontFamily,
    },

    ly: {
      marginLeft: 1,

      color: theme.secondary,
      fontWeight: "900",
      letterSpacing: -0.3,

      fontFamily: typography.fontFamily,
      textShadowColor: isLight
        ? "rgba(139,92,246,0.18)"
        : "rgba(118,56,227,0.6)",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: isLight ? 4 : 10,
    },
  });
}
