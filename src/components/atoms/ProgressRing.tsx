import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors } from "../../theme/color";
import { ProgressProps } from "../../types/common.types";

const ProgressRing = ({
  size = 78,
  strokeWidth = 6,
  progress = 82,
  showGradient = true,
}: ProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = circumference - (circumference * progress) / 100;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {showGradient && (
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.successDark} />
              <Stop offset="100%" stopColor={colors.success} />
            </LinearGradient>
          </Defs>
        )}

        <Circle
          stroke={colors.border}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          opacity={0.4}
        />

        <Circle
          stroke={showGradient ? "url(#grad)" : colors.secondary}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.center}>
        <Text
          style={[
            styles.score,
            { fontSize: size * 0.28, color: colors.textPrimary },
          ]}
        >
          {progress}
        </Text>
        <Text
          style={[
            styles.ats,
            { fontSize: size * 0.12, color: colors.textSecondary },
          ]}
        >
          ATS
        </Text>
      </View>
    </View>
  );
};

export default ProgressRing;

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  score: {
    fontWeight: "900",
  },
  ats: {
    marginTop: -2,
  },
});
