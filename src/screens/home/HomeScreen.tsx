import type { NavigationProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect } from "react";
import { ScrollView, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { HeroHeader } from "../../components/layouts/HeroHeader";
import { useHome, useProfile } from "../../hooks";
import type {
  RootStackParamList,
  RootTabParamList,
} from "../../types/navigation.types";
import { getGreeting } from "../../utils";
import { CareerTips } from "./components/CareerTips";
import { LatestScoreCard } from "./components/LatestScoreCard";
import { QuickActions } from "./components/QuickActions";
import { StatsRow } from "./components/StatsRow";
import { styles } from "./styles";

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const rootNav = navigation.getParent() as
    | NavigationProp<RootStackParamList>
    | undefined;

  const { user, refetch: refetchProfile } = useProfile();
  const {
    loading,
    error,
    firstName,
    latestScore,
    highestScore,
    resumeCount,
    sessionCount,
    refetch: refetchStats,
  } = useHome();

  // On focus: silently re-check both profile and stats.
  // Neither will trigger a re-render unless data actually changed.
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
    }, [refetchProfile, refetchStats]),
  );

  const screenOpacity = useSharedValue(0);
  const screenY = useSharedValue(20);
  const screenAnim = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenY.value }],
  }));

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    screenY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [screenOpacity, screenY]);

  const greet = getGreeting();
  const displayName = user?.firstName || firstName;
  const avatarUri =
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  return (
    <Animated.View style={[{ flex: 1 }, screenAnim]}>
      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HeroHeader
          greet={greet}
          firstName={user?.firstName ?? firstName}
          lastName={user?.lastName ?? ""}
          avatarUrl={user?.avatarUrl}
          avatarUri={avatarUri}
          credits={user?.credits ?? 0}
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <StatsRow
          loading={loading}
          highestScore={highestScore}
          resumeCount={resumeCount}
          sessionCount={sessionCount}
          navigation={navigation}
          rootNav={rootNav}
          onRefresh={refetchStats}
        />
        <LatestScoreCard
          loading={loading}
          latestScore={latestScore}
          rootNav={rootNav}
        />
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <QuickActions navigation={navigation} />
        <CareerTips />
      </ScrollView>
    </Animated.View>
  );
}
