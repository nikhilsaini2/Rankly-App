import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
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
import { NOTIF_STORAGE_KEY } from "../../constants/content";
import { useProfile } from "../../hooks";
import { useProfileStats } from "../../hooks/useProfileStats";
import {
  updateUserProfile,
  uploadAvatarFromUri,
  UserProfileUpdate,
} from "../../services/profile/profileService";
import { colors } from "../../theme/color";
import type { User } from "../../types/common.types";
import { BioCard } from "./components/BioCard";
import { DangerZone } from "./components/DangerZone";
import { EditProfileForm } from "./components/EditProfileForm";
import { ProfileHero } from "./components/ProfileHero";
import { SettingsCard } from "./components/SettingsCard";
import { StatsStrip } from "./components/StatsStrip";
import { styles } from "./styles";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user, loading, error, refetch: refetchProfile } = useProfile();

  const { stats, refetch: refetchStats } = useProfileStats(user?.id);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
    }, [refetchProfile, refetchStats]),
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<UserProfileUpdate>({});
  const [notif, setNotif] = useState(false);
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
      refetchProfile();
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
      refetchProfile();
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
  }, [stats.resumes, stats.bestAts, stats.interviews]);

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

  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const initials = getInitials(user?.firstName, user?.lastName);
  const planLabel = (user?.plan === "pro" ? "Pro" : "Free").toUpperCase();
  const creditsLabel = `${user?.credits ?? 0} CREDITS`;
  const appVersion = "1.0.0";

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
          onPress={refetchProfile}
          style={{ color: colors.primary, marginTop: 16, fontWeight: "600" }}
        >
          Try again
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root]}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        <ProfileHero
          user={user}
          fullName={fullName}
          initials={initials}
          planLabel={planLabel}
          creditsLabel={creditsLabel}
          badgeStyle={badgeStyle}
          avatarRingStyle={avatarRingStyle}
          pickAvatar={pickAvatar}
          savingAvatar={savingAvatar}
          editing={editing}
          onEditPress={() => openEdit(user)}
        />

        {editing ? (
          <EditProfileForm
            draft={draft}
            roleModal={roleModal}
            setRoleModal={setRoleModal}
            setDraft={setDraft}
          />
        ) : (
          <>
            <StatsStrip statsDisplay={statsDisplay} />
            <BioCard user={user} />
          </>
        )}

        {!editing && (
          <>
            <SettingsCard notif={notif} onToggleNotif={onToggleNotif} />
            <DangerZone appVersion={appVersion} />
          </>
        )}
      </ScrollView>

      {editing && (
        <View
          style={[styles.editActionBar, { paddingBottom: insets.bottom + 12 }]}
        >
          <TouchableOpacity
            onPress={cancelEdit}
            style={styles.editCancelBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.editCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveEdit}
            disabled={saving}
            style={[styles.editSaveBtn, saving && { opacity: 0.6 }]}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.editSaveText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
