import React from "react";
import { FlatList, Text, View } from "react-native";
import { CAREER_TIPS } from "../../../constants/content";
import { useAppTheme } from "../../../theme/useAppTheme";
import { createHomeStyles } from "../styles";

export function CareerTips() {
  const theme = useAppTheme();
  const styles = createHomeStyles(theme);

  return (
    <>
      <Text style={styles.sectionTitle}>Career tips</Text>
      <FlatList
        horizontal
        data={CAREER_TIPS}
        keyExtractor={(item) => item.title + Math.random().toString()}
        showsHorizontalScrollIndicator={false}
        snapToInterval={280}
        decelerationRate="fast"
        contentContainerStyle={{ paddingLeft: 0, paddingRight: 16 }}
        renderItem={({ item }) => (
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>{item.icon}</Text>
            <Text style={styles.tipTitle}>{item.title}</Text>
            <Text style={styles.tipBody}>{item.body}</Text>
          </View>
        )}
      />
    </>
  );
}
