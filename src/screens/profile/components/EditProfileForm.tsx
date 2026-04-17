import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { experienceLevels, roles } from "../../../constants/all";
import { useAppTheme } from "../../../theme/useAppTheme";
import type { ExperienceLevel } from "../../../types/common.types";
import { createProfileStyles } from "../styles";

const PREDEFINED_ROLES = roles.filter((r) => r !== "Other");

interface EditProfileFormProps {
  draft: any;
  roleModal: boolean;
  setRoleModal: (open: boolean) => void;
  setDraft: (draft: any) => void;
  email?: string;
}

export function EditProfileForm({
  draft,
  roleModal,
  setRoleModal,
  setDraft,
  email,
}: EditProfileFormProps) {
  const theme = useAppTheme();
  const styles = createProfileStyles(theme);
  const isCustomRole = draft.role && !PREDEFINED_ROLES.includes(draft.role);
  const [showCustomInput, setShowCustomInput] = useState(isCustomRole);

  return (
    <View style={{ marginBottom: 24, gap: 14 }}>
      <Field
        label="First name"
        value={draft.firstName ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, firstName: t }))}
        maxLength={30}
        theme={theme}
        styles={styles}
      />
      <Field
        label="Last name"
        value={draft.lastName ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, lastName: t }))}
        maxLength={30}
        theme={theme}
        styles={styles}
      />
      {email ? (
        <View>
          <Text style={styles.labelsRole}>Email</Text>
          <View style={[styles.inputBase, { opacity: 0.55 }]}>
            <Text style={{ color: theme.textPrimary, fontSize: 14 }} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={styles.labelsRole}>Target role</Text>
      <TouchableOpacity
        onPress={() => setRoleModal(true)}
        style={styles.inputBase}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={{ color: theme.textPrimary, fontSize: 16 }}>
          {showCustomInput ? "Other" : (draft.role ?? "Select role")}
        </Text>
      </TouchableOpacity>
      {showCustomInput && (
        <TextInput
          style={styles.inputBase}
          placeholder="Enter your target role"
          placeholderTextColor={theme.placeholder}
          value={isCustomRole ? draft.role : ""}
          onChangeText={(t) => setDraft((d: any) => ({ ...d, role: t }))}
          autoCapitalize="words"
          returnKeyType="done"
          accessibilityLabel="Custom role input"
        />
      )}
      <Modal
        visible={roleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setRoleModal(false)}
      >
        <View style={styles.modalScrim}>
          <Pressable style={styles.modalScrimFill} onPress={() => setRoleModal(false)} />
          <View style={styles.modalSheetWrap}>
            <Text style={styles.modalTitle}>Target role</Text>
            <FlatList
              data={[...PREDEFINED_ROLES, "Other"]}
              keyExtractor={(item) => item}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const isOther = item === "Other";
                const selected = isOther
                  ? showCustomInput
                  : draft.role === item && !showCustomInput;
                return (
                  <TouchableOpacity
                    style={[styles.modalRow, selected && styles.modalRowActive]}
                    onPress={() => {
                      if (isOther) {
                        setShowCustomInput(true);
                        setDraft((d: any) => ({ ...d, role: "" }));
                      } else {
                        setShowCustomInput(false);
                        setDraft((d: any) => ({ ...d, role: item }));
                      }
                      setRoleModal(false);
                    }}
                  >
                    <Text style={{ color: theme.textPrimary, fontSize: 16, flex: 1 }}>
                      {item}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={22} color={theme.accent} />
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
              onPress={() => setDraft((d: any) => ({ ...d, experienceLevel: r.value as ExperienceLevel }))}
              style={[styles.chipsBase, on && styles.chipsActive]}
            >
              <Text style={[styles.chipsText, on && styles.chipsTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Field
        label="Industry"
        value={draft.industry ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, industry: t }))}
        theme={theme}
        styles={styles}
      />
      <Field
        label="LinkedIn URL"
        value={draft.linkedinUrl ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, linkedinUrl: t }))}
        autoCapitalize="none"
        theme={theme}
        styles={styles}
      />
      <Text style={styles.labelsRole}>Bio</Text>
      <TextInput
        style={styles.inputArea}
        placeholder="Tell recruiters about you"
        placeholderTextColor={theme.placeholder}
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
  maxLength,
  theme,
  styles,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  autoCapitalize?: "none" | "sentences";
  maxLength?: number;
  theme: ReturnType<typeof useAppTheme>;
  styles: ReturnType<typeof createProfileStyles>;
}) {
  return (
    <View>
      <Text style={styles.labelsRole}>{label}</Text>
      <TextInput
        style={styles.inputBase}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={theme.placeholder}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  );
}
