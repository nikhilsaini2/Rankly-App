import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { NavigationContainer } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "./src/components/atoms/Toast";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { GlobalBackground } from "./src/components/GlobalBackground";
import RootNavigator from "./src/navigation/RootNavigator";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider>
    <ToastProvider>{children}</ToastProvider>
  </SafeAreaProvider>
);

export default function App() {
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle("dark");
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
