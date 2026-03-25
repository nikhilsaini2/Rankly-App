import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { GlobalBackground } from "./src/components/GlobalBackground";
// import RootNavigator from "./src/navigation/RootNavigator";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { persistor, store } from "./src/store/auth/authStore";

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <PersistGate persistor={persistor}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </PersistGate>
  </Provider>
);

export default function App() {
  return (
    <AppProviders>
      <NavigationContainer>
        <GlobalBackground>
          {/* <RootNavigator /> */}
          <AppNavigator />
        </GlobalBackground>
      </NavigationContainer>
    </AppProviders>
  );
}
