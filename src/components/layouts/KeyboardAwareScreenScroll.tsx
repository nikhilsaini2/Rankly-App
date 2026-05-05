import React, { forwardRef, useCallback, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type KeyboardAwareScreenScrollProps = ScrollViewProps & {
  /**
   * Extra bottom padding below scroll content (in addition to safe-area bottom).
   * Use for spacing above the home indicator or tab bars (see `useBottomTabBarHeight`).
   */
  extraBottomPad?: number;
  /** Passed through to `KeyboardAvoidingView` when the scroll sits below a fixed chrome row. */
  keyboardVerticalOffset?: number;
  /** Alias merged with `ref` (legacy keyboard-aware-scroll-view API). */
  innerRef?: React.Ref<ScrollView>;
};

function assignScrollRef(
  instance: ScrollView | null,
  ...refs: Array<React.Ref<ScrollView> | undefined>
): void {
  for (const r of refs) {
    if (r == null) continue;
    if (typeof r === "function") r(instance);
    else (r as React.MutableRefObject<ScrollView | null>).current = instance;
  }
}

export const KeyboardAwareScreenScroll = forwardRef<
  ScrollView,
  KeyboardAwareScreenScrollProps
>(function KeyboardAwareScreenScroll(
  {
    children,
    extraBottomPad = 0,
    keyboardVerticalOffset = 0,
    innerRef,
    keyboardShouldPersistTaps = "handled",
    keyboardDismissMode = "interactive",
    showsVerticalScrollIndicator = false,
    contentContainerStyle,
    style,
    ...rest
  },
  ref,
) {
  const insets = useSafeAreaInsets();

  const mergedContentContainerStyle = useMemo<StyleProp<ViewStyle>>(() => {
    const flat = StyleSheet.flatten(contentContainerStyle) ?? {};
    const callerBottom =
      typeof flat.paddingBottom === "number" ? flat.paddingBottom : 0;
    return [
      contentContainerStyle,
      {
        paddingBottom: callerBottom + insets.bottom + extraBottomPad,
      },
    ];
  }, [contentContainerStyle, insets.bottom, extraBottomPad]);

  const handleRef = useCallback(
    (instance: ScrollView | null) => {
      assignScrollRef(instance, ref as React.Ref<ScrollView>, innerRef);
    },
    [ref, innerRef],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={handleRef}
        style={[{ flex: 1 }, style]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        automaticallyAdjustKeyboardInsets={false}
        {...(Platform.OS === "ios"
          ? { contentInsetAdjustmentBehavior: "never" as const }
          : {})}
        {...(Platform.OS === "android" ? { nestedScrollEnabled: true } : {})}
        {...rest}
        contentContainerStyle={mergedContentContainerStyle}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});
