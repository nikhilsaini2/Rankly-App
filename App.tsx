import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { NavigationContainer } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
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
    <SafeAreaProvider>
      <ThemePersistence />
      {/* SystemBarsManager: keeps status bar + nav bar in sync with theme */}
      <SystemBarsManager />
      <ToastProvider>{children}</ToastProvider>
    </SafeAreaProvider>
  </Provider>
);

export default function App() {
  // Set initial nav bar icon style for dark theme (default) before Redux hydrates
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle("light");
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
