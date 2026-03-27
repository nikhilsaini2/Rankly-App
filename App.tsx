import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GlobalBackground } from "./src/components/GlobalBackground";
import RootNavigator from "./src/navigation/RootNavigator";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider>{children}</SafeAreaProvider>
);

export default function App() {
  return (
    <AppProviders>
      <NavigationContainer>
        <GlobalBackground>
          <RootNavigator />
          {/* <AppNavigator /> */}
        </GlobalBackground>
      </NavigationContainer>
    </AppProviders>
  );
}
