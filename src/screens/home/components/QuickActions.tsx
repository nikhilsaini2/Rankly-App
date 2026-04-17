import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import { PressableScale } from "../../../components/atoms/PressableScale";
import { useAppTheme } from "../../../theme/useAppTheme";
import { QuickActionsProps } from "../../../types";
import { createHomeStyles } from "../styles";

export function QuickActions({ navigation }: QuickActionsProps) {
  const theme = useAppTheme();
  const styles = createHomeStyles(theme);

  return (
    <View style={styles.grid}>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() => navigation.navigate("Resume")}
      >
        <LinearGradient
          colors={[theme.surface, theme.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons
            name="document-text-outline"
            size={32}
            color={theme.primary}
          />
          <Text style={styles.actionLab}>Upload Resume</Text>
        </LinearGradient>
      </PressableScale>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() => navigation.getParent()?.navigate("SalaryNegotiation")}
      >
        <LinearGradient
          colors={[theme.surface, theme.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons name="cash-outline" size={32} color={theme.success} />
          <Text style={styles.actionLab}>Salary Coach</Text>
        </LinearGradient>
      </PressableScale>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() => navigation.navigate("AI", { initialSegment: "chat" })}
      >
        <LinearGradient
          colors={[theme.surface, theme.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={32}
            color={theme.warning}
          />
          <Text style={styles.actionLab}>AI Career Chat</Text>
        </LinearGradient>
      </PressableScale>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() => navigation.getParent()?.navigate("ResumeBuilder")}
      >
        <LinearGradient
          colors={[theme.surface, theme.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons
            name="document-text-outline"
            size={32}
            color={theme.primary}
          />
          <Text style={styles.actionLab}>Resume Builder</Text>
        </LinearGradient>
      </PressableScale>
      <PressableScale
        style={{ flex: 1, minWidth: "42%" }}
        onPress={() =>
          navigation.navigate("AI", { initialSegment: "interview" })
        }
      >
        <LinearGradient
          colors={[theme.surface, theme.surfaceAlt]}
          style={styles.actionCard}
        >
          <Ionicons name="mic-outline" size={32} color={theme.secondary} />
          <Text style={styles.actionLab}>Practice Interview</Text>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}
