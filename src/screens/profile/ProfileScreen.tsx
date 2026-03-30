import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../components/atoms/Toast";
import ProfileActions from "../../components/layouts/profileActions";
import ProfileHeader from "../../components/layouts/profileHeader";
import ProfileStats from "../../components/layouts/profileStats";
import { experienceLevels, TARGET_ROLES } from "../../constants/all";
import { NOTIF_STORAGE_KEY } from "../../constants/content";
import { useProfile } from "../../hooks/useProfile";
import {
  getProfileStatsForUser,
  uploadAvatarFromUri,
  updateUserProfile,
  UserProfileUpdate,
} from "../../services/profile/profileService";
import { colors } from "../../theme/color";
import type { ExperienceLevel, User } from "../../types/common.types";

// NOTIF_STORAGE_KEY is imported from constants/content

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
  const [roleModal, setRoleModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_STORAGE_KEY).then((v) => setNotif(v === "1"));
  }, []);

  useEffect(() => {
    let alive = true;
    if (!user?.id) return;

    (async () => {
      const nextStats = await getProfileStatsForUser(user.id);
      if (alive) setStats(nextStats);
    })().catch(() => {
      // Keep UI stable; stats will remain at previous values.
    });

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
        toast(
          "Avatar upload failed — check Storage bucket 'avatars'",
          "error",
        );
        return;
      }
      toast("Avatar upload failed", "error");
    }
  }

  async function onToggleNotif(v: boolean) {
    setNotif(v);
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, v ? "1" : "0");
  }

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
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[colors.primary, "transparent"]}
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: 300,
          top: -100,
          left: -100,
          opacity: 0.4,
        }}
      />

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 50 + insets.bottom,
        }}
      >
        <ProfileHeader
          user={user}
          onAvatarPress={pickAvatar}
          editing={editing}
          onEditPress={() => openEdit(user)}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          saving={saving}
        />

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
            <Text style={labels.role}>Target role</Text>
            <TouchableOpacity onPress={() => setRoleModal(true)} style={inp}>
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
              <View style={modalScrim}>
                <Pressable
                  style={modalScrimFill}
                  onPress={() => setRoleModal(false)}
                />
                <View style={modalSheetWrap}>
                  <Text style={modalTitle}>Target role</Text>
                  <FlatList
                    data={TARGET_ROLES}
                    keyExtractor={(item) => item}
                    style={{ maxHeight: 400 }}
                    renderItem={({ item }) => {
                      const selected = draft.role === item;
                      return (
                        <TouchableOpacity
                          style={[modalRow, selected && modalRowOn]}
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
            <Text style={labels.role}>Experience</Text>
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
                    style={[chips.base, on && chips.on]}
                  >
                    <Text style={[chips.txt, on && chips.txtOn]}>
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
            <Text style={labels.role}>Bio</Text>
            <TextInput
              style={area}
              placeholder="Tell recruiters about you"
              placeholderTextColor={colors.textMuted}
              value={draft.bio ?? ""}
              onChangeText={(t) => setDraft((d) => ({ ...d, bio: t }))}
              multiline
            />
          </View>
        ) : null}

        <ProfileStats
          resumeCount={stats.resumes}
          bestAts={stats.bestAts}
          interviewsDone={stats.interviews}
        />
        <ProfileActions
          notificationsOn={notif}
          onToggleNotifications={onToggleNotif}
          onDeleted={() => {}}
        />
      </ScrollView>
    </View>
  );
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
      <Text style={labels.role}>{label}</Text>
      <TextInput
        style={inp}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const labels = {
  role: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
};

const inp = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: colors.textPrimary,
  fontSize: 16,
};

const area = {
  ...inp,
  minHeight: 100,
  textAlignVertical: "top" as const,
};

const chips = {
  base: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  on: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  txt: { color: colors.textSecondary, fontSize: 13 },
  txtOn: { color: colors.textPrimary, fontWeight: "700" as const },
};

const modalScrim = {
  flex: 1,
};

const modalScrimFill = {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0,0,0,0.55)",
};

const modalSheetWrap = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.surface,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingTop: 16,
  paddingHorizontal: 16,
  paddingBottom: 32,
  borderTopWidth: 1,
  borderColor: colors.border,
};

const modalTitle = {
  color: colors.textPrimary,
  fontSize: 18,
  fontWeight: "700" as const,
  marginBottom: 12,
};

const modalRow = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
};

const modalRowOn = { backgroundColor: colors.surfaceAlt };
