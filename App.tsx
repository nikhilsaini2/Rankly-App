import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { NavigationContainer } from "@react-navigation/native";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "./src/components/atoms/Toast";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { GlobalBackground } from "./src/components/GlobalBackground";
import RootNavigator from "./src/navigation/RootNavigator";
import { store } from "./src/store/store";
import { SystemBarsManager } from "./src/store/SystemBarsManager";
import { ThemePersistence } from "./src/store/ThemePersistence";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    {/* ThemePersistence: loads/saves theme to AsyncStorage */}
    <ThemePersistence />
    {/* SystemBarsManager: keeps status bar + nav bar in sync with theme */}
    <SystemBarsManager />
    <SafeAreaProvider>
      <ToastProvider>{children}</ToastProvider>
    </SafeAreaProvider>
  </Provider>
);

export default function App() {
  // Android nav bar initial style is now handled by SystemBarsManager.
  // This effect is kept only as a fallback for the very first frame on Android
  // before the Redux store hydrates (avoids a brief white nav bar flash).
  useEffect(() => {
    if (Platform.OS === "android") {
      try {
        // Default to dark style (white icons) matching the default dark theme.
        // SystemBarsManager will override this once the store is ready.
        const { NavigationBar } = require("expo-navigation-bar");
        NavigationBar.setStyle("light");
      } catch {
        // Safe to ignore
      }
    }
  }, []);

  return (
    <AppProviders>
      <NavigationContainer>
        <ErrorBoundary>
          <GlobalBackground>
            <RootNavigator />
          </GlobalBackground>
        </ErrorBoundary>
      </NavigationContainer>
    </AppProviders>
  );
}
