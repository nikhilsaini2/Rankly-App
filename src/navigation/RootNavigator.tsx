import type { Session } from "@supabase/supabase-js";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../services/supabase/supabase";
import { ensureUserProfileExists } from "../services/supabase/auth.supabase";
import { colors } from "../theme/color";
import { AppNavigator } from "./AppNavigator";
import { AuthNavigator } from "./AuthNavigator";

const RootNavigator = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        await ensureUserProfileExists(s.user).catch((e) => {
          if (__DEV__) console.error("[RootNavigator] ensureUserProfileExists failed", e);
        });
      }
      setSession(s);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      void (async () => {
        if (s?.user) {
          await ensureUserProfileExists(s.user).catch((e) => {
            if (__DEV__) console.error("[RootNavigator] ensureUserProfileExists failed", e);
          });
        }
        setSession(s);
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return session?.user ? <AppNavigator /> : <AuthNavigator />;
};

export default RootNavigator;
