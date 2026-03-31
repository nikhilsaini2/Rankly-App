import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../components/atoms/Toast";
import { experienceLevels, TARGET_ROLES } from "../../constants/all";
import { NOTIF_STORAGE_KEY } from "../../constants/content";
import { useProfile } from "../../hooks/useProfile";
import {
  deleteUserAccountData,
  getProfileStatsForUser,
  logout,
  updateUserProfile,
  uploadAvatarFromUri,
  UserProfileUpdate,
} from "../../services/profile/profileService";
import { colors } from "../../theme/color";
import type { ExperienceLevel, User } from "../../types/common.types";
import { styles } from "./styles";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user, loading, error, refetch } = useProfile();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<UserProfileUpdate>({});
  const [notif, setNotif] = useState(false);
  const [stats, setStats] = useState({
    resumes: 0,
    bestAts: 0,
    interviews: 0,
  });
  const [statsDisplay, setStatsDisplay] = useState({
    resumes: 0,
    bestAts: 0,
    interviews: 0,
  });
  const [roleModal, setRoleModal] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const zone = useSharedValue(0);
  useEffect(() => {
    zone.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [zone]);

  const avatarRot = useSharedValue(0);
  useEffect(() => {
    avatarRot.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [avatarRot]);

  const avatarRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${avatarRot.value}deg` }],
  }));

  const badgeO = useSharedValue(0);
  useEffect(() => {
    badgeO.value = withDelay(150, withTiming(1, { duration: 200 }));
  }, [badgeO]);
  const badgeStyle = useAnimatedStyle(() => ({ opacity: badgeO.value }));

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_STORAGE_KEY).then((v) => setNotif(v === "1"));
  }, []);

  useEffect(() => {
    let alive = true;
    if (!user?.id) return;

    (async () => {
      const nextStats = await getProfileStatsForUser(user.id);
      if (alive) setStats(nextStats);
    })().catch(() => {});

    return () => {
      alive = false;
    };
  }, [user?.id]);

  function openEdit(u: User) {
    setDraft({
      firstName: u.firstName,
      lastName: u.lastName,
      bio: u.bio,
      role: u.role,
      experienceLevel: u.experienceLevel ?? undefined,
      industry: u.industry ?? "",
      linkedinUrl: u.linkedinUrl ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(draft);
      toast("Profile updated!", "success");
      setEditing(false);
      refetch();
    } catch {
      toast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (user) {
      setDraft({
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        role: user.role,
        experienceLevel: user.experienceLevel ?? undefined,
        industry: user.industry ?? "",
        linkedinUrl: user.linkedinUrl ?? "",
      });
    }
    setEditing(false);
  }

  async function pickAvatar() {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo access to set avatar.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as ImagePicker.MediaType[],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const uri = res.assets[0].uri;
    try {
      setSavingAvatar(true);
      const publicUrl = await uploadAvatarFromUri(user.id, uri);
      try {
        await updateUserProfile({ avatarUrl: publicUrl });
      } catch (e) {
        if (__DEV__) console.error("Avatar profile update failed", e);
        toast("Could not save avatar", "error");
        return;
      }
      toast("Avatar updated", "success");
      refetch();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message?: unknown }).message ?? "")
            : "";
      if (__DEV__) console.error("Avatar upload failed", e);
      if (message === "Could not get avatar URL") {
        toast("Could not get avatar URL", "error");
        return;
      }
      if (message === "Avatar storage upload failed") {
        toast("Avatar upload failed — check Storage bucket 'avatars'", "error");
        return;
      }
      toast("Avatar upload failed", "error");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function onToggleNotif(v: boolean) {
    setNotif(v);
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, v ? "1" : "0");
  }

  // NOTE: All hooks must run before any early returns (Rules of Hooks).
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const initials = getInitials(user?.firstName, user?.lastName);
  const planLabel = (user?.plan === "pro" ? "Pro" : "Free").toUpperCase();
  const creditsLabel = `${user?.credits ?? 0} CREDITS`;
  const appVersion = "1.0.0";

  const statsDidAnimate = useSharedValue(0);
  const sResumes = useSharedValue(0);
  const sBest = useSharedValue(0);
  const sInterviews = useSharedValue(0);

  useEffect(() => {
    if (statsDidAnimate.value === 1) return;
    const hasReal =
      stats.resumes > 0 || stats.bestAts > 0 || stats.interviews > 0;
    if (!hasReal) {
      setStatsDisplay(stats);
      return;
    }
    statsDidAnimate.value = 1;
    sResumes.value = withTiming(stats.resumes, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    sBest.value = withTiming(stats.bestAts, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    sInterviews.value = withTiming(stats.interviews, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [stats.bestAts, stats.interviews, stats.resumes]);

  useAnimatedReaction(
    () => ({
      resumes: Math.floor(sResumes.value),
      bestAts: Math.floor(sBest.value),
      interviews: Math.floor(sInterviews.value),
    }),
    (next) => {
      runOnJS(setStatsDisplay)(next);
    },
    [],
  );

  const z1 = useAnimatedStyle(() => ({
    opacity: zone.value,
    transform: [{ translateY: (1 - zone.value) * 20 }],
  }));
  const z2 = useAnimatedStyle(() => ({
    opacity: zone.value,
    transform: [{ translateY: (1 - zone.value) * 20 }],
  }));
  const z3 = useAnimatedStyle(() => ({
    opacity: zone.value,
    transform: [{ translateY: (1 - zone.value) * 20 }],
  }));
  const z4 = useAnimatedStyle(() => ({
    opacity: zone.value,
    transform: [{ translateY: (1 - zone.value) * 20 }],
  }));
  const z5 = useAnimatedStyle(() => ({
    opacity: zone.value,
    transform: [{ translateY: (1 - zone.value) * 20 }],
  }));

  if (loading && !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgPrimary,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgPrimary,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
          {error ?? "Could not load profile"}
        </Text>
        <Text
          onPress={refetch}
          style={{ color: colors.primary, marginTop: 16, fontWeight: "600" }}
        >
          Try again
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* ZONE 1 — HERO */}
        <Animated.View style={[styles.heroWrap, z1]}>
          <LinearGradient
            colors={["rgba(108,99,255,0.18)", "rgba(13,13,20,0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroBanner}
            pointerEvents="none"
          />

          <View style={styles.heroInner}>
            <View style={styles.avatarOuter}>
              <Animated.View style={[styles.avatarRing, avatarRingStyle]}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>

              <View style={styles.avatarSeparator}>
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={pickAvatar}
                style={styles.avatarEditBtn}
                accessibilityRole="button"
              >
                <Feather name="edit-2" size={13} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.heroName}>{fullName || "—"}</Text>
            <Text style={styles.heroRole}>{user.role || "—"}</Text>

            <Animated.View style={[styles.badgeRow, badgeStyle]}>
              <View style={styles.planBadge}>
                <Feather name="star" size={11} color={colors.primary} />
                <Text style={styles.planBadgeText}>{planLabel}</Text>
              </View>
              <View style={styles.creditsBadge}>
                <Feather name="zap" size={11} color={colors.accent} />
                <Text style={styles.creditsBadgeText}>{creditsLabel}</Text>
              </View>
            </Animated.View>

            {savingAvatar ? (
              <View style={styles.avatarBusyRow}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text style={styles.avatarBusyText}>Updating avatar…</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {editing ? (
          <View style={{ marginBottom: 24, gap: 14 }}>
            <Field
              label="First name"
              value={draft.firstName ?? ""}
              onChange={(t) => setDraft((d) => ({ ...d, firstName: t }))}
            />
            <Field
              label="Last name"
              value={draft.lastName ?? ""}
              onChange={(t) => setDraft((d) => ({ ...d, lastName: t }))}
            />
            <Text style={styles.labelsRole}>Target role</Text>
            <TouchableOpacity
              onPress={() => setRoleModal(true)}
              style={styles.inputBase}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                {draft.role ?? "Select role"}
              </Text>
            </TouchableOpacity>
            <Modal
              visible={roleModal}
              animationType="slide"
              transparent
              onRequestClose={() => setRoleModal(false)}
            >
              <View style={styles.modalScrim}>
                <Pressable
                  style={styles.modalScrimFill}
                  onPress={() => setRoleModal(false)}
                />
                <View style={styles.modalSheetWrap}>
                  <Text style={styles.modalTitle}>Target role</Text>
                  <FlatList
                    data={TARGET_ROLES}
                    keyExtractor={(item) => item}
                    style={{ maxHeight: 400 }}
                    renderItem={({ item }) => {
                      const selected = draft.role === item;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.modalRow,
                            selected && styles.modalRowActive,
                          ]}
                          onPress={() => {
                            setDraft((d) => ({ ...d, role: item }));
                            setRoleModal(false);
                          }}
                        >
                          <Text
                            style={{
                              color: colors.textPrimary,
                              fontSize: 16,
                              flex: 1,
                            }}
                          >
                            {item}
                          </Text>
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={22}
                              color={colors.accent}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </View>
            </Modal>
            <Text style={styles.labelsRole}>Experience</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {experienceLevels.map((r) => {
                const on = draft.experienceLevel === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        experienceLevel: r.value as ExperienceLevel,
                      }))
                    }
                    style={[styles.chipsBase, on && styles.chipsActive]}
                  >
                    <Text
                      style={[styles.chipsText, on && styles.chipsTextActive]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Field
              label="Industry"
              value={draft.industry ?? ""}
              onChange={(t) => setDraft((d) => ({ ...d, industry: t }))}
            />
            <Field
              label="LinkedIn URL"
              value={draft.linkedinUrl ?? ""}
              onChange={(t) => setDraft((d) => ({ ...d, linkedinUrl: t }))}
              autoCapitalize="none"
            />
            <Text style={styles.labelsRole}>Bio</Text>
            <TextInput
              style={styles.inputArea}
              placeholder="Tell recruiters about you"
              placeholderTextColor={colors.textMuted}
              value={draft.bio ?? ""}
              onChangeText={(t) => setDraft((d) => ({ ...d, bio: t }))}
              multiline
            />
          </View>
        ) : null}

        {/* ZONE 2 — STATS STRIP */}
        <Animated.View style={[styles.statsStrip, z2]}>
          <View style={styles.statCell}>
            <Text
              style={[
                styles.statValue,
                statsDisplay.resumes === 0 && styles.statValueMuted,
              ]}
            >
              {statsDisplay.resumes === 0 ? "—" : String(statsDisplay.resumes)}
            </Text>
            <Text style={styles.statLabel}>Resumes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text
              style={[
                styles.statValue,
                statsDisplay.bestAts === 0 && styles.statValueMuted,
                statsDisplay.bestAts > 0 && styles.statBest,
              ]}
            >
              {statsDisplay.bestAts === 0 ? "—" : String(statsDisplay.bestAts)}
            </Text>
            <Text style={styles.statLabel}>Best ATS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text
              style={[
                styles.statValue,
                statsDisplay.interviews === 0 && styles.statValueMuted,
              ]}
            >
              {statsDisplay.interviews === 0
                ? "—"
                : String(statsDisplay.interviews)}
            </Text>
            <Text style={styles.statLabel}>Interviews</Text>
          </View>
        </Animated.View>

        {/* ZONE 3 — BIO CARD */}
        <Animated.View style={[styles.bioCard, z3]}>
          <View style={styles.bioHeaderRow}>
            <Text style={styles.sectionCap}>ABOUT</Text>
            <TouchableOpacity
              onPress={() => openEdit(user)}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.bioEditLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.bioText, !user.bio && styles.bioPlaceholder]}>
            {user.bio
              ? user.bio
              : "No bio added yet. Tap Edit to add a short description about yourself."}
          </Text>
        </Animated.View>

        {/* ZONE 4 — SETTINGS */}
        <Animated.View style={[styles.settingsCard, z4]}>
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIconBox, styles.settingsIconNotif]}>
              <Feather name="bell" size={16} color={colors.primary} />
            </View>
            <Text style={styles.settingsLabel}>Notifications</Text>
            <Switch
              value={notif}
              onValueChange={onToggleNotif}
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
          <View style={styles.settingsDivider} />
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              Linking.openURL("https://example.com/privacy").catch(() => {})
            }
          >
            <View style={styles.settingsRow}>
              <View
                style={[styles.settingsIconBox, styles.settingsIconPrivacy]}
              >
                <Feather name="shield" size={16} color={colors.accent} />
              </View>
              <Text style={styles.settingsLabel}>Privacy Policy</Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
          <View style={styles.settingsDivider} />
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              Linking.openURL("https://example.com/terms").catch(() => {})
            }
          >
            <View style={styles.settingsRow}>
              <View style={[styles.settingsIconBox, styles.settingsIconTerms]}>
                <Feather
                  name="file-text"
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
              <Text style={styles.settingsLabel}>Terms of Service</Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ZONE 5 — DANGER */}
        <Animated.View style={[styles.dangerWrap, z5]}>
          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.dangerRow,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={[styles.dangerIconCircle, styles.dangerIconPrimaryBg]}>
              <Feather name="log-out" size={16} color={colors.primary} />
            </View>
            <Text style={styles.signOutText}>Sign Out</Text>
            <Feather
              name="chevron-right"
              size={16}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "Delete account",
                "This removes your Rankly profile data from this device session. You may need to contact support to fully remove your auth account.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await deleteUserAccountData();
                      } catch {
                        Alert.alert("Could not delete account data");
                      }
                    },
                  },
                ],
              )
            }
            style={({ pressed }) => [
              styles.dangerRow,
              styles.deleteRow,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={[styles.dangerIconCircle, styles.dangerIconDangerBg]}>
              <Feather name="trash-2" size={16} color={colors.danger} />
            </View>
            <Text style={styles.deleteText}>Delete Account</Text>
            <Feather
              name="chevron-right"
              size={16}
              color={"rgba(255,92,92,0.5)"}
            />
          </Pressable>

          <Text style={styles.footerCaption}>
            Version {appVersion} · Made with{" "}
            <Text style={styles.footerHeart}>♥</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  const a = (firstName ?? "").trim();
  const b = (lastName ?? "").trim();
  const i1 = a ? a[0] : "";
  const i2 = b ? b[0] : "";
  const out = `${i1}${i2}`.toUpperCase();
  return out || "—";
}

function Field({
  label,
  value,
  onChange,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View>
      <Text style={styles.labelsRole}>{label}</Text>
      <TextInput
        style={styles.inputBase}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}
