# Requirements Document

## Introduction

This feature adds a scalable light/dark theme system to the Rankly React Native (Expo) app. The existing dark theme remains exactly unchanged. A light theme is derived from the dark theme's color palette — inheriting brand colors while substituting background, surface, and text tokens with light-mode equivalents. Theme state is managed via Redux Toolkit, enabling instant UI updates without app reload or flicker. A theme toggle is exposed in the Profile screen's Settings card, using the same pill row style as Privacy Policy and Terms of Service. No business logic, API calls, or feature flows are modified — only the styling system is refactored.

---

## Glossary

- **Theme_System**: The set of files, hooks, and Redux state that govern which color palette is active across the app.
- **Dark_Theme**: The existing color palette defined in `src/theme/color.ts`, which must remain unchanged.
- **Light_Theme**: A derived color palette defined in `src/theme/lightTheme.ts`, using white/light backgrounds and dark text while inheriting brand colors from Dark_Theme.
- **Theme_Slice**: The Redux Toolkit slice in `src/store/themeSlice.ts` that holds the active theme mode (`"dark"` | `"light"`).
- **Theme_Hook**: The custom hook `src/theme/useAppTheme.ts` that reads the active mode from Redux and returns the corresponding theme object.
- **Redux_Store**: The Redux store that wraps the entire app and provides global state access.
- **Settings_Card**: The `SettingsCard` component in the Profile screen that renders pill-style rows for app settings.
- **Theme_Toggle**: The interactive row in the Settings_Card that dispatches `toggleTheme` to switch between light and dark modes.
- **createStyles**: A factory function pattern used in components — `createStyles(theme)` — that returns a `StyleSheet` object using theme tokens instead of static color imports.
- **Component**: Any React Native screen or UI component that currently imports `colors` from `src/theme/color.ts` for styling.

---

## Requirements

### Requirement 1: Light Theme Definition

**User Story:** As a developer, I want a light theme derived from the existing dark theme, so that the app can display a consistent light color palette without introducing arbitrary new colors.

#### Acceptance Criteria

1. THE Theme_System SHALL define a Light_Theme object in `src/theme/lightTheme.ts` that imports the Dark_Theme color tokens as its base.
2. THE Light_Theme SHALL set `background` to `"#FFFFFF"`, `surface` to `"#F7F7FB"`, `surfaceAlt` to `"#FFFFFF"`, `bgPrimary` to `"#FFFFFF"`, and `bgSecondary` to `"#F7F7FB"`.
3. THE Light_Theme SHALL set `glass` to `"rgba(255,255,255,0.9)"`.
4. THE Light_Theme SHALL inherit `primary`, `primaryDark`, `secondary`, `secondaryDark`, `primaryLight`, `accent`, `danger`, `warning`, `success`, `error`, and `glow` directly from Dark_Theme without modification.
5. THE Light_Theme SHALL set `textPrimary` to `"#111111"`, `textSecondary` to `"#555555"`, and `textMuted` to `"#888888"`.
6. THE Light_Theme SHALL set `border` to `"#E5E7EB"` and `borderStrong` to `"rgba(139, 92, 246, 0.25)"`.
7. THE Light_Theme SHALL set `successDark` to `"#DCFCE7"`.
8. THE Theme_System SHALL NOT modify any value in the existing Dark_Theme (`src/theme/color.ts`).

---

### Requirement 2: Redux Theme State Management

**User Story:** As a developer, I want theme mode stored in Redux, so that any component in the app can react to theme changes instantly without prop drilling.

#### Acceptance Criteria

1. THE Theme_Slice SHALL be created at `src/store/themeSlice.ts` using Redux Toolkit's `createSlice`.
2. THE Theme_Slice SHALL define an initial state of `{ mode: "dark" }`, preserving the existing dark-first experience.
3. THE Theme_Slice SHALL expose a `toggleTheme` reducer that switches `mode` between `"dark"` and `"light"`.
4. THE Theme_Slice SHALL expose a `setTheme` reducer that accepts a payload of `"dark"` or `"light"` and sets `mode` to that value.
5. THE Redux_Store SHALL be configured at `src/store/store.ts` and include the Theme_Slice reducer.
6. THE Redux_Store Provider SHALL wrap the entire app in `App.tsx` so all components have access to theme state.

---

### Requirement 3: Theme Hook

**User Story:** As a developer, I want a single hook that returns the active theme object, so that components can consume theme tokens without knowing about Redux directly.

#### Acceptance Criteria

1. THE Theme_Hook SHALL be created at `src/theme/useAppTheme.ts`.
2. WHEN the Redux `mode` is `"dark"`, THE Theme_Hook SHALL return the Dark_Theme color object.
3. WHEN the Redux `mode` is `"light"`, THE Theme_Hook SHALL return the Light_Theme color object.
4. THE Theme_Hook SHALL use `useSelector` from `react-redux` to read the current mode from the Redux_Store.
5. WHEN the Redux `mode` changes, THE Theme_Hook SHALL cause all consuming components to re-render with the new theme tokens without requiring an app reload.

---

### Requirement 4: Component Style Refactoring

**User Story:** As a developer, I want all components to consume theme tokens via the Theme_Hook, so that no component contains hardcoded color imports or inline theme conditionals.

#### Acceptance Criteria

1. THE Theme_System SHALL replace all direct `import { colors } from "@/theme/colors"` (or equivalent relative path) usages in Components with a call to `useAppTheme()`.
2. THE Theme_System SHALL convert static `StyleSheet.create({})` blocks in Components to a `createStyles(theme)` factory function pattern, where `theme` is the object returned by `useAppTheme()`.
3. WHEN a Component renders, THE Component SHALL call `const theme = useAppTheme()` and `const styles = createStyles(theme)` to obtain theme-aware styles.
4. THE Theme_System SHALL NOT introduce any `theme === "dark"` or `theme === "light"` conditional expressions inside Component render logic or style definitions.
5. THE Theme_System SHALL NOT modify any business logic, API calls, navigation configuration, or feature behavior during the refactoring.

---

### Requirement 5: Theme Toggle in Profile Screen

**User Story:** As a user, I want a theme toggle in the Profile screen's Settings card, so that I can switch between light and dark mode without leaving the app.

#### Acceptance Criteria

1. THE Settings_Card SHALL include a Theme_Toggle row using the same pill row style (`settingsRow`, `settingsIconBox`) as the Privacy Policy and Terms of Service rows.
2. WHEN the active mode is `"dark"`, THE Theme_Toggle SHALL display a sun icon (indicating the action will switch to light mode) and the label `"Light Mode"`.
3. WHEN the active mode is `"light"`, THE Theme_Toggle SHALL display a moon icon (indicating the action will switch to dark mode) and the label `"Dark Mode"`.
4. WHEN the user presses the Theme_Toggle, THE Theme_Toggle SHALL dispatch the `toggleTheme` action to the Redux_Store.
5. WHEN `toggleTheme` is dispatched, THE Theme_System SHALL update the UI of all visible screens instantly without triggering a navigator remount or app reload.
6. THE Theme_Toggle SHALL be positioned within the Settings_Card above the Privacy Policy row, consistent with the existing row ordering pattern.

---

### Requirement 6: Instant UI Update Without Flicker

**User Story:** As a user, I want the theme to switch instantly when I toggle it, so that the experience feels responsive and polished.

#### Acceptance Criteria

1. WHEN `toggleTheme` is dispatched, THE Redux_Store SHALL update the `mode` state synchronously.
2. WHEN the `mode` state updates, THE Theme_Hook SHALL return the new theme object on the next render cycle.
3. THE Theme_System SHALL NOT use `setTimeout`, `InteractionManager`, or any deferred mechanism to apply theme changes.
4. THE Theme_System SHALL NOT remount the navigation stack or reload the app when the theme changes.
5. WHILE the theme is switching, THE Theme_System SHALL NOT produce a white flash, black flash, or any intermediate blank frame visible to the user.

---

### Requirement 7: Global Provider Setup

**User Story:** As a developer, I want the Redux Provider to wrap the entire app, so that all screens and components can access theme state from any point in the component tree.

#### Acceptance Criteria

1. THE Redux_Store Provider SHALL be added to `App.tsx` as the outermost wrapper, enclosing `SafeAreaProvider`, `NavigationContainer`, and all child components.
2. THE Theme_System SHALL NOT require any screen or component to receive the theme as a prop — all theme access SHALL occur through the Theme_Hook.
3. IF the Redux_Store Provider is absent from the component tree, THEN THE Theme_Hook SHALL throw a descriptive error indicating the store is not configured.
