import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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

/**
 * `scrollResponderScrollNativeHandleToKeyboard` extra offset — larger ⇒ field sits higher.
 * Tiered so upper rows aren’t pinned to the top while lowest rows still clear IME + Save/Cancel.
 */
const KEYBOARD_SCROLL_EXTRA = {
  upper: { android: 64, ios: 48 },
  mid: { android: 96, ios: 80 },
  lower: { android: 176, ios: 148 },
  nearBottom: { android: 224, ios: 186 },
  /** Bio is last in scroll content + multiline — IME/layout settles later than single-line fields */
  bottom: { android: 292, ios: 246 },
} as const;

/** Multiline bio: escalate clearance until IME + footer metrics exist (scrollResponder often undershoots once). */
const BIO_SCROLL_EXTRAS_ANDROID = [300, 352, 404, 448];
const BIO_SCROLL_EXTRAS_IOS = [252, 286, 318];

type KeyboardScrollTier = keyof typeof KEYBOARD_SCROLL_EXTRA;

interface EditProfileFormProps {
  draft: any;
  roleModal: boolean;
  setRoleModal: (open: boolean) => void;
  setDraft: (draft: any) => void;
  email?: string;
  isCustomRole: boolean;
  setIsCustomRole: (v: boolean) => void;
  scrollRef?: React.RefObject<ScrollView | null>;
}

export function EditProfileForm({
  draft,
  roleModal,
  setRoleModal,
  setDraft,
  email,
  isCustomRole,
  setIsCustomRole,
  scrollRef,
}: EditProfileFormProps) {
  const theme = useAppTheme();
  const styles = createProfileStyles(theme);
  const [customRoleTouched, setCustomRoleTouched] = useState(false);
  const showCustomInput = isCustomRole;
  const customRoleError =
    showCustomInput && customRoleTouched && !draft.role?.trim()
      ? "Please enter your target role"
      : undefined;

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const customRoleRef = useRef<TextInput>(null);
  const industryRef = useRef<TextInput>(null);
  const linkedinRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);

  const scrollInputIntoView = useCallback(
    (inputRef: React.RefObject<TextInput | null>, tier: KeyboardScrollTier) => {
      const scroll = scrollRef?.current;
      const input = inputRef.current;
      if (!scroll || !input) return;
      const cfg = KEYBOARD_SCROLL_EXTRA[tier];
      const extra = Platform.OS === "android" ? cfg.android : cfg.ios;
      const run = () => {
        scroll.scrollResponderScrollNativeHandleToKeyboard?.(
          input as never,
          extra,
          false,
        );
      };
      const isHeavyTier =
        tier === "nearBottom" || tier === "bottom" || tier === "lower";
      requestAnimationFrame(() => {
        run();
        setTimeout(run, Platform.OS === "android" ? 72 : 36);
        if (isHeavyTier) {
          setTimeout(run, Platform.OS === "android" ? 190 : 100);
          if (Platform.OS === "android") {
            setTimeout(run, 360);
          }
        } else {
          setTimeout(run, Platform.OS === "android" ? 140 : 0);
        }
      });
    },
    [scrollRef],
  );

  const scrollBioIntoView = useCallback(() => {
    const scroll = scrollRef?.current;
    const input = bioRef.current;
    if (!scroll || !input) return;

    const extras =
      Platform.OS === "android" ? BIO_SCROLL_EXTRAS_ANDROID : BIO_SCROLL_EXTRAS_IOS;

    const apply = (extra: number) => {
      scroll.scrollResponderScrollNativeHandleToKeyboard?.(
        input as never,
        extra,
        false,
      );
    };

    scrollInputIntoView(bioRef, "bottom");

    requestAnimationFrame(() => {
      extras.forEach((extra, i) => {
        const delay =
          i === 0
            ? Platform.OS === "android"
              ? 120
              : 80
            : Platform.OS === "android"
              ? 120 + i * 155
              : 90 + i * 140;
        setTimeout(() => apply(extra), delay);
      });
    });
  }, [scrollInputIntoView, scrollRef]);

  return (
    <View style={{ marginBottom: 24, gap: 14 }}>
      <Field
        ref={firstNameRef}
        label="First name"
        value={draft.firstName ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, firstName: t }))}
        maxLength={30}
        theme={theme}
        styles={styles}
        onFocus={() => scrollInputIntoView(firstNameRef, "upper")}
      />
      <Field
        ref={lastNameRef}
        label="Last name"
        value={draft.lastName ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, lastName: t }))}
        maxLength={30}
        theme={theme}
        styles={styles}
        onFocus={() => scrollInputIntoView(lastNameRef, "upper")}
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
        <View>
          <TextInput
            ref={customRoleRef}
            style={[
              styles.inputBase,
              customRoleError ? { borderColor: theme.danger, borderWidth: 1.5 } : undefined,
            ]}
            placeholder="Enter your target role"
            placeholderTextColor={theme.placeholder}
            value={isCustomRole ? draft.role : ""}
            onChangeText={(t) => {
              setCustomRoleTouched(true);
              setDraft((d: any) => ({ ...d, role: t }));
            }}
            onBlur={() => setCustomRoleTouched(true)}
            onFocus={() => scrollInputIntoView(customRoleRef, "mid")}
            autoCapitalize="words"
            returnKeyType="done"
            accessibilityLabel="Custom role input"
          />
          {customRoleError ? (
            <Text style={{ color: theme.danger, fontSize: 12, marginTop: 4, marginLeft: 2 }}>
              {customRoleError}
            </Text>
          ) : null}
        </View>
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
                        setIsCustomRole(true);
                        setCustomRoleTouched(false);
                        setDraft((d: any) => ({ ...d, role: "" }));
                      } else {
                        setIsCustomRole(false);
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
              onPress={() =>
                setDraft((d: any) => ({ ...d, experienceLevel: r.value as ExperienceLevel }))
              }
              style={[styles.chipsBase, on && styles.chipsActive]}
            >
              <Text style={[styles.chipsText, on && styles.chipsTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Field
        ref={industryRef}
        label="Industry"
        value={draft.industry ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, industry: t }))}
        theme={theme}
        styles={styles}
        onFocus={() => scrollInputIntoView(industryRef, "lower")}
      />
      <Field
        ref={linkedinRef}
        label="LinkedIn URL"
        value={draft.linkedinUrl ?? ""}
        onChange={(t) => setDraft((d: any) => ({ ...d, linkedinUrl: t }))}
        autoCapitalize="none"
        theme={theme}
        styles={styles}
        onFocus={() => scrollInputIntoView(linkedinRef, "nearBottom")}
      />
      {/* collapsable={false}: Android otherwise flattens views and breaks scroll-to-focused-input measurement for multiline */}
      <View collapsable={false}>
        <Text style={styles.labelsRole}>Bio</Text>
        <TextInput
          ref={bioRef}
          style={styles.inputArea}
          placeholder="Tell recruiters about you"
          placeholderTextColor={theme.placeholder}
          value={draft.bio ?? ""}
          onChangeText={(t) => setDraft((d: any) => ({ ...d, bio: t }))}
          multiline
          onFocus={scrollBioIntoView}
        />
      </View>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (t: string) => void;
  autoCapitalize?: "none" | "sentences";
  maxLength?: number;
  theme: ReturnType<typeof useAppTheme>;
  styles: ReturnType<typeof createProfileStyles>;
  onFocus?: () => void;
};

const Field = React.forwardRef<TextInput, FieldProps>(function Field(
  {
    label,
    value,
    onChange,
    autoCapitalize = "sentences",
    maxLength,
    theme,
    styles,
    onFocus,
  },
  ref,
) {
  return (
    <View>
      <Text style={styles.labelsRole}>{label}</Text>
      <TextInput
        ref={ref}
        style={styles.inputBase}
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        placeholderTextColor={theme.placeholder}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  );
});
