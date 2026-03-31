import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { PressableScale } from "../../components/atoms/PressableScale";
import { ScoreRing } from "../../components/atoms/ScoreRing";
import { Skeleton } from "../../components/atoms/Skeleton";
import { HeroHeader } from "../../components/layouts/HeroHeader";
import { CAREER_TIPS } from "../../constants/content";
import { useHome } from "../../hooks/useHome";
import { useProfile } from "../../hooks/useProfile";
import { logout } from "../../services/profile/profileService";
import { colors } from "../../theme/color";
import type {
  RootStackParamList,
  RootTabParamList,
} from "../../types/navigation.types";
import { getGreeting } from "../../utils/date";
import { scoreTierColor, scoreTierLabel } from "../../utils/score";
import { styles } from "./styles";

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const rootNav = navigation.getParent() as
    | NavigationProp<RootStackParamList>
    | undefined;
  const { user } = useProfile();
  const {
    loading,
    error,
    firstName,
    latestScore,
    resumeCount,
    interviewsDone,
  } = useHome();

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

        <View style={styles.statsRow}>
          {loading ? (
            <>
              <Skeleton style={styles.statSk} />
              <Skeleton style={styles.statSk} />
              <Skeleton style={styles.statSk} />
            </>
          ) : (
            <>
              <PressableScale
                style={styles.statPress}
                onPress={() => {
                  if (latestScore?.resumeId) {
                    rootNav?.navigate("AtsScore", {
                      resumeId: latestScore.resumeId,
                      scoreId: latestScore.id,
                    });
                  } else {
                    navigation.navigate("Resume");
                  }
                }}
              >
                <View style={styles.statCard}>
                  <Ionicons
                    name="speedometer-outline"
                    size={18}
                    color={colors.primaryLight}
                  />
                  <Text
                    style={[
                      styles.statVal,
                      latestScore
                        ? { color: scoreTierColor(latestScore.overallScore) }
                        : null,
                    ]}
                  >
                    {latestScore ? `${latestScore.overallScore}` : "—"}
                  </Text>
                  <Text style={styles.statLab}>ATS Score</Text>
                </View>
              </PressableScale>
              <PressableScale
                style={styles.statPress}
                onPress={() => navigation.navigate("Resume")}
              >
                <View style={styles.statCard}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={colors.primaryLight}
                  />
                  <Text style={styles.statVal}>{`${resumeCount}`}</Text>
                  <Text style={styles.statLab}>Resumes</Text>
                </View>
              </PressableScale>
              <PressableScale
                style={styles.statPress}
                onPress={() =>
                  navigation.navigate("AI", { initialSegment: "interview" })
                }
              >
                <View style={styles.statCard}>
                  <Ionicons
                    name="mic-outline"
                    size={18}
                    color={colors.primaryLight}
                  />
                  <Text style={styles.statVal}>{`${interviewsDone}`}</Text>
                  <Text style={styles.statLab}>Sessions</Text>
                </View>
              </PressableScale>
            </>
          )}
        </View>

        {loading ? (
          <Skeleton style={styles.scoreCardSk} />
        ) : latestScore && latestScore.resumeId ? (
          <View style={styles.atsCard}>
            <View style={styles.ringWrap}>
              <ScoreRing
                size={120}
                progress={latestScore.overallScore}
                strokeColor={scoreTierColor(latestScore.overallScore)}
                displayValue={latestScore.overallScore}
                subtitle={scoreTierLabel(latestScore.overallScore)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.atsTitle}>Latest ATS check</Text>
              <View style={styles.tierPillWide}>
                <Text style={styles.tierPillTxt}>
                  {scoreTierLabel(latestScore.overallScore)}
                </Text>
              </View>
              <PressableScale
                onPress={() =>
                  rootNav?.navigate("AtsScore", {
                    resumeId: latestScore.resumeId!,
                    scoreId: latestScore.id,
                  })
                }
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.reportBtn}
                >
                  <Text style={styles.reportBtnText}>View Full Report</Text>
                </LinearGradient>
              </PressableScale>
            </View>
          </View>
        ) : (
          <View style={styles.emptyScoreCard}>
            <Ionicons
              name="analytics-outline"
              size={40}
              color={colors.textMuted}
            />
            <Text style={styles.emptyScoreTitle}>No ATS score yet</Text>
            <Text style={styles.emptyScoreSub}>
              Upload your resume to get your ATS score
            </Text>
            <PressableScale onPress={() => logout()}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.getStartedBtn}
              >
                <Text style={styles.getStartedTxt}>Get started</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick actions</Text>
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
              <Ionicons
                name="analytics-outline"
                size={32}
                color={colors.accent}
              />
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
            onPress={() =>
              navigation.navigate("AI", { initialSegment: "chat" })
            }
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

        <Text style={styles.sectionTitle}>Career tips</Text>
        <FlatList
          horizontal
          data={CAREER_TIPS}
          keyExtractor={(item) => item.title}
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
      </ScrollView>
    </Animated.View>
  );
}
