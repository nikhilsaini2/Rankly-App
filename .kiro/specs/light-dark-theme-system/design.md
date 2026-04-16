# Design Document: Light/Dark Theme System

## Overview

This design adds a scalable light/dark theme system to the Rankly React Native (Expo) app. The approach is minimal and surgical: a new light theme file is derived from the existing dark theme, Redux Toolkit manages the active mode, a single hook abstracts theme access, and components are refactored to consume theme tokens via that hook. The existing dark theme (`src/theme/color.ts`) is never modified.

The system is designed so that toggling the theme dispatches a single Redux action, which causes all `useSelector`-subscribed components to re-render synchronously with the new palette — no navigation remount, no deferred updates, no flicker.

**Key design decisions:**
- Redux Toolkit is chosen for theme state because it is already the intended state management direction for the app (the requirements specify it), and it provides zero-boilerplate slice creation with `createSlice`.
- The `useAppTheme()` hook is the single point of theme consumption — no component ever imports `colors` directly or receives a theme prop.
- The `createStyles(theme)` factory pattern keeps styles co-located with components while remaining theme-aware.
- Redux Toolkit (`@reduxjs/toolkit` + `react-redux`) must be added as a dependency since it is not currently in `package.json`.

---

## Architecture

```
App.tsx
└── Provider (Redux store)
    └── SafeAreaProvider
        └── NavigationContainer
            └── ... all screens and components
                    │
                    ▼
            useAppTheme()  ←──  useSelector(state.theme.mode)
                    │
                    ▼
            createStyles(theme)  →  StyleSheet
```

### Data flow

1. App boots → Redux store initializes with `{ theme: { mode: "dark" } }`.
2. Every component calls `const theme = useAppTheme()` → receives the dark theme object.
3. User presses the Theme Toggle in the Profile screen → `toggleTheme` is dispatched.
4. Redux reducer flips `mode` to `"light"` synchronously.
5. `useSelector` notifies all subscribed components → they re-render with the light theme.
6. No navigation remount, no `setTimeout`, no intermediate blank frame.

### Dependency addition

`@reduxjs/toolkit` and `react-redux` must be installed:

```bash
npx expo install @reduxjs/toolkit react-redux
```

---

## Components and Interfaces

### 1. `src/theme/lightTheme.ts`

Exports a single `lightColors` object with the same shape as `colors` from `color.ts`. Brand tokens are imported directly from the dark theme to guarantee they stay in sync.

```typescript
import { colors as darkColors } from './color';

export const lightColors = {
  // Backgrounds / surfaces
  background:   '#FFFFFF',
  surface:      '#F7F7FB',
  surfaceAlt:   '#FFFFFF',
  bgPrimary:    '#FFFFFF',
  bgSecondary:  '#F7F7FB',
  glass:        'rgba(255,255,255,0.9)',

  // Brand tokens — inherited unchanged from dark theme
  primary:      darkColors.primary,
  primaryDark:  darkColors.primaryDark,
  secondary:    darkColors.secondary,
  secondaryDark: darkColors.secondaryDark,
  primaryLight: darkColors.primaryLight,
  accent:       darkColors.accent,
  danger:       darkColors.danger,
  warning:      darkColors.warning,
  success:      darkColors.success,
  error:        darkColors.error,
  glow:         darkColors.glow,

  // Text
  textPrimary:   '#111111',
  textSecondary: '#555555',
  textMuted:     '#888888',
  inputLabel:    '#555555',
  placeholder:   '#888888',

  // Borders
  border:       '#E5E7EB',
  borderStrong: 'rgba(139, 92, 246, 0.25)',

  // Status
  successDark: '#DCFCE7',
} as const;
```

The `as const` assertion ensures the type is a readonly literal object, matching the shape of `colors` from `color.ts`.

---

### 2. `src/store/themeSlice.ts`

A Redux Toolkit slice with two reducers: `toggleTheme` and `setTheme`.

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
}

const initialState: ThemeState = { mode: 'dark' };

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
```

---

### 3. `src/store/store.ts`

Configures the Redux store and exports typed hooks.

```typescript
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

### 4. `src/theme/useAppTheme.ts`

The single hook that maps Redux mode → theme object. Components never import `colors` directly.

```typescript
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { colors as darkColors } from './color';
import { lightColors } from './lightTheme';

export function useAppTheme() {
  const mode = useSelector((state: RootState) => state.theme.mode);
  return mode === 'dark' ? darkColors : lightColors;
}
```

If the Redux `Provider` is absent from the component tree, `useSelector` will throw:
> `"Could not find "store" in the context of "Connect(...)". Either wrap the root component in a <Provider>, or pass a custom React context provider..."`

This satisfies Requirement 7.3 without any custom error handling.

---

### 5. Component refactoring pattern — `createStyles(theme)`

Every component that currently does:

```typescript
import { colors } from '../../theme/color';
const styles = StyleSheet.create({ container: { backgroundColor: colors.background } });
```

Is refactored to:

```typescript
import { useAppTheme } from '../../theme/useAppTheme';

function MyComponent() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  // ...
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: { backgroundColor: theme.background },
  });
}
```

**Rules enforced by this pattern:**
- No `import { colors }` anywhere in components.
- No `theme === 'dark'` conditionals — all variation is expressed through token values.
- `createStyles` is a plain function (not a hook), so it can be defined outside the component body and called inside render.
- For performance-sensitive components, `createStyles` can be memoized with `useMemo(() => createStyles(theme), [theme])`.

---

### 6. Profile screen — Theme Toggle row

The `SettingsCard` component gains a new prop `onThemeToggle` and reads the current mode from the Redux store via `useAppTheme()`.

**Updated `SettingsCardProps`:**

```typescript
interface SettingsCardProps {
  notif: boolean;
  onToggleNotif: (value: boolean) => void;
  onInterviewHistoryPress: () => void;
  onResumeHistoryPress: () => void;
  onThemeToggle: () => void;   // new
}
```

**Toggle row (inserted above Privacy Policy):**

```tsx
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';

// Inside SettingsCard:
const mode = useSelector((state: RootState) => state.theme.mode);
const isDark = mode === 'dark';

<TouchableOpacity activeOpacity={0.9} onPress={onThemeToggle}>
  <View style={styles.settingsRow}>
    <View style={[styles.settingsIconBox, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={16}
        color="#F59E0B"
      />
    </View>
    <Text style={styles.settingsLabel}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </Text>
    <Feather name="chevron-right" size={16} color={colors.textSecondary} />
  </View>
</TouchableOpacity>
<View style={styles.settingsDivider} />
```

The `onThemeToggle` callback is provided by `ProfileScreen`, which dispatches `toggleTheme`:

```typescript
import { useDispatch } from 'react-redux';
import { toggleTheme } from '../../store/themeSlice';

const dispatch = useDispatch();
const handleThemeToggle = useCallback(() => dispatch(toggleTheme()), [dispatch]);
```

---

### 7. `App.tsx` — Redux Provider as outermost wrapper

```tsx
import { Provider } from 'react-redux';
import { store } from './src/store/store';

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <SafeAreaProvider>
      <ToastProvider>{children}</ToastProvider>
    </SafeAreaProvider>
  </Provider>
);
```

`Provider` wraps `SafeAreaProvider` so that all hooks — including `useAppTheme()` — have access to the store from any point in the tree.

---

## Data Models

### Redux state shape

```typescript
// Full store state
{
  theme: {
    mode: 'dark' | 'light'   // initial: 'dark'
  }
}
```

### Theme object shape

Both `colors` (dark) and `lightColors` (light) conform to the same structural type:

```typescript
type AppTheme = {
  background: string;
  surface: string;
  surfaceAlt: string;
  bgPrimary: string;
  bgSecondary: string;
  glass: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  primaryLight: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
  error: string;
  glow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputLabel: string;
  placeholder: string;
  border: string;
  borderStrong: string;
  successDark: string;
};
```

This type can be exported from `src/theme/index.ts` and used as the parameter type for `createStyles(theme: AppTheme)`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Brand tokens are inherited unchanged

*For any* token in the set `{primary, primaryDark, secondary, secondaryDark, primaryLight, accent, danger, warning, success, error, glow}`, the value of that token in `lightColors` SHALL equal the value of the same token in `colors` (dark theme).

**Validates: Requirements 1.4**

---

### Property 2: Dark theme is immutable

*For any* token key in the `colors` object, its value SHALL remain identical to the value present before the light theme system was introduced. No import, re-export, or spread operation in `lightTheme.ts` or any other new file SHALL mutate the `colors` object.

**Validates: Requirements 1.8**

---

### Property 3: toggleTheme is an involution (round-trip)

*For any* starting mode value `m ∈ {"dark", "light"}`, applying `toggleTheme` twice to a state with `mode === m` SHALL return a state with `mode === m`. Equivalently, `toggleTheme` is its own inverse.

**Validates: Requirements 2.3, 6.1**

---

### Property 4: setTheme is idempotent and exact

*For any* value `v ∈ {"dark", "light"}` and *for any* prior state (regardless of current mode), applying `setTheme(v)` SHALL produce a state where `mode === v`.

**Validates: Requirements 2.4**

---

### Property 5: useAppTheme returns the correct theme for any mode

*For any* mode value `m ∈ {"dark", "light"}`, when the Redux store contains `{ theme: { mode: m } }`, `useAppTheme()` SHALL return the theme object that corresponds to `m`: `colors` when `m === "dark"`, and `lightColors` when `m === "light"`.

**Validates: Requirements 3.2, 3.3, 3.5**

---

### Property 6: Theme toggle label and icon reflect the opposite mode

*For any* mode value `m ∈ {"dark", "light"}`, when the Settings card is rendered with a store containing `{ theme: { mode: m } }`, the Theme_Toggle row SHALL display the icon and label for the *opposite* mode: sun icon + "Light Mode" when `m === "dark"`, moon icon + "Dark Mode" when `m === "light"`.

**Validates: Requirements 5.2, 5.3**

---

### Property 7: Missing Provider causes a descriptive error

*For any* component that calls `useAppTheme()` rendered outside a Redux `Provider`, the render SHALL throw an error with a message that identifies the missing store context.

**Validates: Requirements 7.3**

---

## Error Handling

### Missing Redux Provider

`useSelector` (used inside `useAppTheme`) throws a runtime error if no `Provider` is present in the component tree. The error message from `react-redux` is descriptive enough to diagnose the issue. No additional custom error handling is needed.

### Invalid `setTheme` payload

TypeScript's `PayloadAction<ThemeMode>` type constrains the payload to `"dark" | "light"` at compile time. No runtime validation is needed since the app is fully TypeScript.

### Theme token shape mismatch

If `lightColors` is missing a token that `colors` has, TypeScript will surface a type error at compile time (once `AppTheme` is defined and used as the return type of `useAppTheme`). This prevents silent runtime failures where a component accesses `theme.someToken` and gets `undefined`.

### Component renders before store hydration

Redux Toolkit's `configureStore` initializes synchronously. The store is fully hydrated before the first render because `Provider` is the outermost wrapper. There is no async hydration step, so no loading state is needed for the theme.

---

## Testing Strategy

### Dependency

Property-based testing uses **[fast-check](https://github.com/dubzzz/fast-check)** — the standard PBT library for TypeScript/JavaScript. Unit tests use **Jest** (already in `devDependencies`).

Install:
```bash
npm install --save-dev fast-check @testing-library/react-native @testing-library/jest-native
```

### Unit tests (example-based)

These cover specific values and structural assertions:

- `lightTheme.ts`: assert exact token values for background, surface, text, border, glass, successDark tokens (Requirements 1.2, 1.3, 1.5, 1.6, 1.7).
- `themeSlice.ts`: assert initial state is `{ mode: "dark" }` (Requirement 2.2).
- `store.ts`: assert the store has a `theme` key in its initial state (Requirement 2.5).
- `SettingsCard`: render with dark mode store → assert "Light Mode" label and sun icon are present; render with light mode store → assert "Dark Mode" label and moon icon are present.
- `SettingsCard`: simulate press on toggle row → assert `toggleTheme` action was dispatched.
- `SettingsCard`: assert theme toggle row appears before Privacy Policy row in the rendered output.

### Property-based tests

Each property test runs a minimum of **100 iterations**. Tag format: `Feature: light-dark-theme-system, Property N: <property_text>`.

**Property 1 — Brand tokens inherited:**
```typescript
// Feature: light-dark-theme-system, Property 1: Brand tokens are inherited unchanged
const brandTokens = ['primary', 'primaryDark', 'secondary', 'secondaryDark',
                     'primaryLight', 'accent', 'danger', 'warning', 'success', 'error', 'glow'];
fc.assert(fc.property(
  fc.constantFrom(...brandTokens),
  (token) => lightColors[token] === darkColors[token]
));
```

**Property 2 — Dark theme immutable:**
```typescript
// Feature: light-dark-theme-system, Property 2: Dark theme is immutable
const snapshot = JSON.stringify(darkColors);
fc.assert(fc.property(fc.constant(null), () => JSON.stringify(darkColors) === snapshot));
```

**Property 3 — toggleTheme round-trip:**
```typescript
// Feature: light-dark-theme-system, Property 3: toggleTheme is an involution
fc.assert(fc.property(
  fc.constantFrom('dark', 'light') as fc.Arbitrary<ThemeMode>,
  (startMode) => {
    const s0 = { mode: startMode };
    const s1 = themeReducer(s0, toggleTheme());
    const s2 = themeReducer(s1, toggleTheme());
    return s2.mode === startMode;
  }
));
```

**Property 4 — setTheme idempotent:**
```typescript
// Feature: light-dark-theme-system, Property 4: setTheme is idempotent and exact
fc.assert(fc.property(
  fc.constantFrom('dark', 'light') as fc.Arbitrary<ThemeMode>,
  fc.constantFrom('dark', 'light') as fc.Arbitrary<ThemeMode>,
  (priorMode, targetMode) => {
    const prior = { mode: priorMode };
    const result = themeReducer(prior, setTheme(targetMode));
    return result.mode === targetMode;
  }
));
```

**Property 5 — useAppTheme returns correct theme:**
```typescript
// Feature: light-dark-theme-system, Property 5: useAppTheme returns the correct theme for any mode
fc.assert(fc.property(
  fc.constantFrom('dark', 'light') as fc.Arbitrary<ThemeMode>,
  (mode) => {
    const mockStore = configureStore({ reducer: { theme: themeReducer },
                                       preloadedState: { theme: { mode } } });
    const { result } = renderHook(() => useAppTheme(), {
      wrapper: ({ children }) => <Provider store={mockStore}>{children}</Provider>
    });
    const expected = mode === 'dark' ? darkColors : lightColors;
    return JSON.stringify(result.current) === JSON.stringify(expected);
  }
));
```

**Property 6 — Toggle label/icon reflects opposite mode:**
```typescript
// Feature: light-dark-theme-system, Property 6: Theme toggle label and icon reflect the opposite mode
fc.assert(fc.property(
  fc.constantFrom('dark', 'light') as fc.Arbitrary<ThemeMode>,
  (mode) => {
    const mockStore = configureStore({ reducer: { theme: themeReducer },
                                       preloadedState: { theme: { mode } } });
    const { getByText, queryByTestId } = render(
      <Provider store={mockStore}><SettingsCard {...mockProps} /></Provider>
    );
    if (mode === 'dark') {
      return !!getByText('Light Mode') && !!queryByTestId('icon-sunny-outline');
    } else {
      return !!getByText('Dark Mode') && !!queryByTestId('icon-moon-outline');
    }
  }
));
```

**Property 7 — Missing Provider throws:**
```typescript
// Feature: light-dark-theme-system, Property 7: Missing Provider causes a descriptive error
fc.assert(fc.property(fc.constant(null), () => {
  expect(() => {
    renderHook(() => useAppTheme());
  }).toThrow(/store|Provider/i);
  return true;
}));
```

### Integration / smoke tests

- Verify `App.tsx` renders without error with the `Provider` wrapping the full tree.
- Verify that dispatching `toggleTheme` from a test causes a re-render with the new theme (end-to-end Redux → hook → component cycle).
- Manual QA: toggle theme on a physical device and verify no flash or navigation remount occurs.
