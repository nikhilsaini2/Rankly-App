import React from "react";
import { StyleSheet, Text, TextStyle, View } from "react-native";
import { colors } from "../../theme/color";
import { typography } from "../../theme/typography";

type Props = {
  size?: number;
  style?: TextStyle;
};

const AppName = ({ size = 28, style }: Props) => {
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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },

  rank: {
    color: "#EDEDED",
    fontWeight: "700",
    letterSpacing: -0.2,

    fontFamily: typography.fontFamily,
  },

  ly: {
    marginLeft: 1,

    color: colors.secondary,
    fontWeight: "900",
    letterSpacing: -0.3,

    fontFamily: typography.fontFamily,
    textShadowColor: "rgba(118,56,227,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
