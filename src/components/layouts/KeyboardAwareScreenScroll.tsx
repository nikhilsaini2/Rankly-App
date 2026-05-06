import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/useAppTheme";

export type KeyboardAwareScreenScrollProps = ScrollViewProps & {
  /**
   * Extra bottom padding below scroll content (in addition to safe-area bottom).
   * Use for spacing above the home indicator or tab bars (see `useBottomTabBarHeight`).
   */
  extraBottomPad?: number;
  /** Passed through to `KeyboardAvoidingView`. */
  keyboardVerticalOffset?: number;
  /** Paints under Android resize gaps; defaults to `theme.background`. */
  contentBackgroundColor?: string;
  /** Rendered below the scroll view inside `KeyboardAvoidingView` (e.g. sticky Save/Cancel). */
  bottomAccessory?: React.ReactNode;
  /** Alias merged with `ref` (legacy keyboard-aware-scroll-view API). */
  innerRef?: React.Ref<ScrollView>;
  /**
   * When true (default), scroll content adds `insets.bottom` so content clears the home indicator.
   * Set false on tab screens: the tab bar already sits above the inset, and adding both creates a blank strip.
   */
  padSafeAreaBottom?: boolean;
  /**
   * When false, skips `KeyboardAvoidingView` and uses a plain `View` wrapper.
   * Use on tab screens when a stack modal (e.g. Salary) is open: the tab stays mounted and would
   * otherwise react to the modal's keyboard and leave a gap above the tab bar after dismiss.
   */
  keyboardAvoidingEnabled?: boolean;
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
    contentBackgroundColor,
    bottomAccessory,
    padSafeAreaBottom = true,
    keyboardAvoidingEnabled = true,
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
  const theme = useAppTheme();
  const bg = contentBackgroundColor ?? theme.background;
  const insets = useSafeAreaInsets();

  /**
   * Footer (`bottomAccessory`) already sits above home/tab chrome — avoid double-counting `insets.bottom`.
   * Tab screens should set `padSafeAreaBottom={false}` because the tab bar handles bottom inset.
   */
  const scrollSafeBottomInset =
    bottomAccessory != null || !padSafeAreaBottom ? 0 : insets.bottom;

  /**
   * When `bottomAccessory` is used (e.g. Profile Save/Cancel), extra bottom padding only while
   * the IME is open increases scroll content height so the user can scroll through the full form
   * on both platforms (iOS KeyboardAvoidingView + Android resize both shrink the ScrollView).
   */
  const [accessoryKeyboardPad, setAccessoryKeyboardPad] = useState(0);

  useEffect(() => {
    if (bottomAccessory == null) {
      setAccessoryKeyboardPad(0);
      return undefined;
    }
    const onShow = Keyboard.addListener("keyboardDidShow", (e) => {
      const h = e.endCoordinates.height;
      const pad =
        Platform.OS === "ios"
          ? Math.min(280, Math.round(h * 0.3))
          : Math.min(210, Math.round(h * 0.19));
      setAccessoryKeyboardPad(pad);
    });
    const onHide = Keyboard.addListener("keyboardDidHide", () => {
      setAccessoryKeyboardPad(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [bottomAccessory]);

  const mergedContentContainerStyle = useMemo<StyleProp<ViewStyle>>(() => {
    const flat = StyleSheet.flatten(contentContainerStyle) ?? {};
    const callerBottom =
      typeof flat.paddingBottom === "number" ? flat.paddingBottom : 0;
    const kbPad = bottomAccessory != null ? accessoryKeyboardPad : 0;
    return [
      contentContainerStyle,
      {
        paddingBottom:
          callerBottom + scrollSafeBottomInset + extraBottomPad + kbPad,
      },
    ];
  }, [
    contentContainerStyle,
    scrollSafeBottomInset,
    extraBottomPad,
    bottomAccessory,
    accessoryKeyboardPad,
    padSafeAreaBottom,
  ]);

  const handleRef = useCallback(
    (instance: ScrollView | null) => {
      assignScrollRef(instance, ref as React.Ref<ScrollView>, innerRef);
    },
    [ref, innerRef],
  );

  const scrollView = (
    <ScrollView
      ref={handleRef}
      style={[{ flex: 1, backgroundColor: bg }, style]}
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
  );

  const accessory =
    bottomAccessory != null ? (
      <View style={{ flexShrink: 0, backgroundColor: bg }}>{bottomAccessory}</View>
    ) : null;

  /**
   * Android + `adjustResize` + footer: `KeyboardAvoidingView` `behavior="height"` fights window resize
   * and leaves a black strip. Rely on resize + caller scroll-into-view instead.
   */
  if (Platform.OS === "android" && bottomAccessory != null) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        {scrollView}
        {accessory}
      </View>
    );
  }

  const outerStyle = { flex: 1, backgroundColor: bg } as const;

  if (!keyboardAvoidingEnabled) {
    return (
      <View style={outerStyle}>
        {scrollView}
        {accessory}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={outerStyle}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {scrollView}
      {accessory}
    </KeyboardAvoidingView>
  );
});
