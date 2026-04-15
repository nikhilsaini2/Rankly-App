import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { experienceLevels, TARGET_ROLES } from "../../../constants/all";
import { colors } from "../../../theme/color";
import type { ExperienceLevel } from "../../../types/common.types";
import { styles } from "../styles";

interface EditProfileFormProps {
  draft: any;
  roleModal: boolean;
  setRoleModal: (open: boolean) => void;
  setDraft: (draft: any) => void;
}

export function EditProfileForm({
  draft,
  roleModal,
  setRoleModal,
  setDraft,
}: EditProfileFormProps) {
  return (
    <View style={{ marginBottom: 24, gap: 14 }}>
      <Field
        label="First name"
        value={draft.firstName ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, firstName: t }))}
      />
      <Field
        label="Last name"
        value={draft.lastName ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, lastName: t }))}
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
                    style={[styles.modalRow, selected && styles.modalRowActive]}
                    onPress={() => {
                      setDraft((d: any) => ({ ...d, role: item }));
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
                setDraft((d: any) => ({
                  ...d,
                  experienceLevel: r.value as ExperienceLevel,
                }))
              }
              style={[styles.chipsBase, on && styles.chipsActive]}
            >
              <Text style={[styles.chipsText, on && styles.chipsTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Field
        label="Industry"
        value={draft.industry ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, industry: t }))}
      />
      <Field
        label="LinkedIn URL"
        value={draft.linkedinUrl ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, linkedinUrl: t }))}
        autoCapitalize="none"
      />
      <Text style={styles.labelsRole}>Bio</Text>
      <TextInput
        style={styles.inputArea}
        placeholder="Tell recruiters about you"
        placeholderTextColor={colors.placeholder}
        value={draft.bio ?? ""}
        onChangeText={(t) => setDraft((d: any) => ({ ...d, bio: t }))}
        multiline
      />
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
      <Text style={styles.labelsRole}>{label}</Text>
      <TextInput
        style={styles.inputBase}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.placeholder}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}
