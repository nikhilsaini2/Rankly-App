/**
 * ThemePersistence
 *
 * Invisible component that:
 * 1. On mount — reads the saved theme from AsyncStorage and dispatches loadTheme
 * 2. On every mode change after hydration — writes the new mode to AsyncStorage
 *
 * Must be rendered inside the Redux <Provider>.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadTheme, type ThemeMode } from "./themeSlice";
import type { AppDispatch, RootState } from "./store";

const THEME_KEY = "@rankly/theme";

export function ThemePersistence() {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((state: RootState) => state.theme.mode);

  // Tracks whether the initial AsyncStorage read has completed.
  // Using a ref (not state) so flipping it never triggers a re-render.
  const hydrated = useRef(false);

  // ── Step 1: Load persisted theme once on mount ──────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (saved === "light" || saved === "dark") {
          dispatch(loadTheme(saved as ThemeMode));
        }
      })
      .catch(() => {
        // Read failed — silently fall back to the Redux default (dark)
      })
      .finally(() => {
        // Mark hydration complete AFTER the dispatch so the save effect
        // below never writes the default value back over a saved preference.
        hydrated.current = true;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 2: Persist on every subsequent mode change ─────────────────────
  useEffect(() => {
    // Skip the initial render and any renders that happen before hydration
    // completes — we don't want to overwrite a saved "light" with "dark".
    if (!hydrated.current) return;

    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {
      // Write failed — non-fatal, theme still works for the current session
    });
  }, [mode]);

  return null;
}
