import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase/supabase";
import { AppNavigator } from "./AppNavigator";
import { AuthNavigator } from "./AuthNavigator";

const RootNavigator = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;

  return user ? <AppNavigator /> : <AuthNavigator />;
  // return <AuthNavigator />;
};

export default RootNavigator;
