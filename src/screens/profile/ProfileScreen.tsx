import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NavigationProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import type { ResumeHistoryItem } from "../../feature/resume/types/resume.types";
import { useProfile } from "../../hooks";
import { useProfileStats } from "../../hooks/useProfileStats";
import {
  updateUserProfile,
  uploadAvatarFromUri,
  UserProfileUpdate,
} from "../../services/profile/profileService";
import { supabase } from "../../services/supabase/supabase";
import { useDispatch } from "react-redux";
import { toggleTheme } from "../../store/themeSlice";
import { useAppTheme } from "../../theme/useAppTheme";
import type { User } from "../../types/common.types";
import type { RootStackParamList } from "../../types/navigation.types";
import { BioCard } from "./components/BioCard";
import { DangerZone } from "./components/DangerZone";
import { EditProfileForm } from "./components/EditProfileForm";
import { ProfileHero } from "./components/ProfileHero";
import { SettingsCard } from "./components/SettingsCard";
import { StatsStrip } from "./components/StatsStrip";
import { createProfileStyles } from "./styles";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const theme = useAppTheme();
  const profileStyles = createProfileStyles(theme);
  const dispatch = useDispatch();
  const { user, loading, error, refetch: refetchProfile } = useProfile();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const { stats, refetch: refetchStats } = useProfileStats(user?.id);

  // Resume History state
  const [recentResumes, setRecentResumes] = useState<ResumeHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
      return () => {
        // Reset edit state when leaving the tab so Profile always opens clean
        setEditing(false);
      };
    }, [refetchProfile, refetchStats]),
  );

  // Fetch recent resumes
  useFocusEffect(
    useCallback(() => {
      const fetchRecentResumes = async () => {
        try {
          let userId: string | undefined;
          const { data: sessionData } = await supabase.auth.getSession();
          userId = sessionData?.session?.user?.id;
          if (!userId) {
            const { data: userData } = await supabase.auth.getUser();
            userId = userData?.user?.id;
          }
          if (!userId) {
            setRecentResumes([]);
            return;
          }

          const { data } = await supabase
            .from("resume_builds")
            .select(
              "id, user_id, full_name, target_role, experience_level, industry, tone, skills, professional_summary, core_skills, enhanced_experiences, ats_keywords, pdf_uri, created_at",
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(3);

          setRecentResumes(data ?? ([] as ResumeHistoryItem[]));
        } catch {
          setRecentResumes([]);
        } finally {
        }
      };

      fetchRecentResumes();
    }, []),
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<UserProfileUpdate>({});
  const [initialDraft, setInitialDraft] = useState<UserProfileUpdate>({});

  // Normalize before comparison to avoid false dirty on whitespace
  const normalizeDraft = (d: UserProfileUpdate): UserProfileUpdate => ({
    ...d,
    firstName: d.firstName?.trim() ?? "",
    lastName: d.lastName?.trim() ?? "",
    bio: d.bio?.trim() ?? "",
    role: d.role?.trim() ?? "",
    industry: d.industry?.trim() ?? "",
    linkedinUrl: d.linkedinUrl?.trim() ?? "",
  });

  const isDirty = useMemo(
    () =>
      JSON.stringify(normalizeDraft(draft)) !==
      JSON.stringify(normalizeDraft(initialDraft)),
    [draft, initialDraft],
  );
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
    const snapshot: UserProfileUpdate = {
      firstName: u.firstName,
      lastName: u.lastName,
      bio: u.bio,
      role: u.role,
      experienceLevel: u.experienceLevel ?? undefined,
      industry: u.industry ?? "",
      linkedinUrl: u.linkedinUrl ?? "",
    };
    setDraft(snapshot);
    setInitialDraft(snapshot);
    setEditing(true);
  }

  async function saveEdit() {
    if (!user || !isDirty || saving) return;
    setSaving(true);
    try {
      await updateUserProfile(draft);
      toast("Profile updated!", "success");
      setInitialDraft(draft); // reset dirty state
      setEditing(false);
      refetchProfile();
    } catch {
      toast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setDraft(initialDraft);
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
    const asset = res.assets[0];
    const uri = asset.uri;
    const mimeType = asset.mimeType;
    try {
      setSavingAvatar(true);
      const publicUrl = await uploadAvatarFromUri(user.id, uri, mimeType);
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
      if (message === "Failed to read image file") {
        toast("Could not read image file", "error");
        return;
      }
      if (message === "Storage upload failed - check bucket permissions") {
        toast("Avatar upload failed - check Storage bucket 'avatars'", "error");
        return;
      }
      if (message === "Failed to get public URL") {
        toast("Could not get avatar URL", "error");
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

  const handleInterviewHistoryPress = useCallback(
    () => navigation.navigate("InterviewHistory"),
    [navigation],
  );
  const handleResumeHistoryPress = useCallback(
    () => navigation.navigate("ResumeHistory"),
    [navigation],
  );
  const handleThemeToggle = useCallback(
    () => dispatch(toggleTheme()),
    [dispatch],
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
          backgroundColor: theme.bgPrimary,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bgPrimary,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: theme.textSecondary, textAlign: "center" }}>
          {error ?? "Could not load profile"}
        </Text>
        <Text
          onPress={refetchProfile}
          style={{ color: theme.primary, marginTop: 16, fontWeight: "600" }}
        >
          Try again
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 80 : 0}
    >
      <View style={[profileStyles.root]}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            profileStyles.scrollContent,
            { paddingBottom: insets.bottom + 150 },
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
              email={user?.email ?? ""}
            />
          ) : (
            <>
              <StatsStrip statsDisplay={statsDisplay} />
              <BioCard user={user} />

              <SettingsCard
                notif={notif}
                onToggleNotif={onToggleNotif}
                onInterviewHistoryPress={handleInterviewHistoryPress}
                onResumeHistoryPress={handleResumeHistoryPress}
                onThemeToggle={handleThemeToggle}
              />
              <DangerZone
                appVersion={appVersion}
                onError={(msg) => toast(msg, "error")}
                onSuccess={(msg) => toast(msg, "success")}
              />
            </>
          )}
        </ScrollView>

        {editing && (
          <View
            style={[
              profileStyles.editActionBar,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <TouchableOpacity
              onPress={cancelEdit}
              style={profileStyles.editCancelBtn}
              activeOpacity={0.8}
            >
              <Text style={profileStyles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveEdit}
              disabled={!isDirty || saving}
              style={[
                profileStyles.editSaveBtn,
                (!isDirty || saving) && { opacity: 0.45 },
              ]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={profileStyles.editSaveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
