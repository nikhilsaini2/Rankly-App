import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { colors } from "../../../theme/color";
import type { RootTabParamList } from "../../../types/navigation.types";
import { styles } from "../styles";

interface QuickActionsProps {
  navigation: NavigationProp<RootTabParamList>;
}

export function QuickActions({ navigation }: QuickActionsProps) {
  return (
    <View style={styles.grid}>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() => navigation.navigate("Resume")}
      >
        <LinearGradient
          colors={[colors.surface, colors.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons
            name="document-text-outline"
            size={32}
            color={colors.primary}
          />
          <Text style={styles.actionLab}>Upload Resume</Text>
        </LinearGradient>
      </PressableScale>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() => navigation.navigate("Resume")}
      >
        <LinearGradient
          colors={[colors.surface, colors.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons name="analytics-outline" size={32} color={colors.accent} />
          <Text style={styles.actionLab}>Check Score</Text>
        </LinearGradient>
      </PressableScale>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() =>
          navigation.navigate("AI", { initialSegment: "interview" })
        }
      >
        <LinearGradient
          colors={[colors.surface, colors.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons name="mic-outline" size={32} color={colors.secondary} />
          <Text style={styles.actionLab}>Practice Interview</Text>
        </LinearGradient>
      </PressableScale>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() => navigation.navigate("AI", { initialSegment: "chat" })}
      >
        <LinearGradient
          colors={[colors.surface, colors.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={32}
            color={colors.warning}
          />
          <Text style={styles.actionLab}>AI Career Chat</Text>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}
