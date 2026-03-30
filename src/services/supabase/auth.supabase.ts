import { GoogleSignin } from "@react-native-google-signin/google-signin";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { RegisterPayload } from "../../types/common.types";
import { supabase } from "./supabase";

export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signOut();

  const userInfo = await GoogleSignin.signIn();
  const { idToken } = await GoogleSignin.getTokens();

  if (!idToken) throw new Error("Google sign-in failed");

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) throw error;
  if (!data.user) throw new Error("Authentication failed");

  return data.user;
};

export const registerUser = async ({
  email,
  password,
  firstName,
  lastName,
  role,
}: RegisterPayload) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { firstName, lastName, role },
    },
  });

  if (error) throw new Error(mapAuthError(error.message, error.code));
  if (!data.user) throw new Error("User creation failed");

  return data.user;
};

export const signInWithEmailPassword = async (
  email: string,
  password: string,
): Promise<SupabaseUser> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(mapAuthError(error.message, error.code));
  if (!data.user) throw new Error("Authentication failed");

  return data.user;
};

export const getAuthSessionUser = async (): Promise<SupabaseUser | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
};

function mapAuthError(message: string, code?: string): string {
  if (code === "user_already_exists") return "Email already in use";
  if (code === "invalid_credentials") return "Invalid email or password";
  if (code === "invalid_email") return "Invalid email address";
  if (code === "weak_password") return "Password must be at least 6 characters";

  const msg = message.toLowerCase();

  if (msg.includes("already")) return "Email already in use";
  if (msg.includes("email")) return "Invalid email address";
  if (msg.includes("password")) return "Password must be at least 6 characters";

  return "Registration failed";
}

export const handleUserProfile = async (user: SupabaseUser) => {
  if (!user?.id) return;

  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const getString = (obj: Record<string, unknown>, key: string) => {
    const v = obj[key];
    return typeof v === "string" ? v : undefined;
  };

  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("auth_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existingUser) return;

  const provider = getString(appMeta, "provider") ?? "";
  const email = user.email ?? "";

  let firstName = "User";
  let lastName = "";

  if (provider === "google") {
    const fullName = getString(userMeta, "full_name") ?? "";
    if (fullName) {
      const parts = fullName.split(" ");
      firstName = parts[0] || "User";
      lastName = parts.slice(1).join(" ") || "";
    } else {
      firstName = email.split("@")[0] || "User";
    }
  } else {
    firstName =
      getString(userMeta, "firstName") ?? email.split("@")[0] ?? "User";
    lastName = getString(userMeta, "lastName") ?? "";
  }

  const role = getString(userMeta, "role") ?? "SWE";

  const { error: insertError } = await supabase.from("users").upsert(
    {
      auth_id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      target_role: role,
    },
    { onConflict: "auth_id" },
  );

  if (insertError) {
    if (
      insertError.message.includes("row-level security") ||
      insertError.message.includes("duplicate")
    ) {
      return;
    }
    throw insertError;
  }
};

export const ensureUserProfileExists = async (
  user: SupabaseUser,
): Promise<void> => {
  if (!user?.id) return;

  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("auth_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (fetchError) {
    // Don't block app rendering for a best-effort profile bootstrap.
    if (__DEV__) console.error("[ensureUserProfileExists]", fetchError);
    return;
  }
  if (existing) return;

  const email = user.email ?? "";
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const getString = (obj: Record<string, unknown>, key: string) => {
    const v = obj[key];
    return typeof v === "string" ? v : undefined;
  };

  const provider = getString(appMeta, "provider") ?? "";
  const fullName = getString(userMeta, "full_name");

  let firstName = "User";
  let lastName = "";

  if (provider === "google") {
    if (fullName) {
      const parts = fullName.split(" ");
      firstName = parts[0] || "User";
      lastName = parts.slice(1).join(" ") || "";
    } else {
      firstName = email.split("@")[0] || "User";
    }
  } else {
    const firstFromMeta = getString(userMeta, "firstName");
    firstName = firstFromMeta ?? email.split("@")[0] ?? "User";
    lastName = getString(userMeta, "lastName") ?? "";
  }

  const avatarUrl = getString(userMeta, "avatar_url");

  const role = getString(userMeta, "role") ?? "SWE";

  const now = new Date().toISOString();

  const { error: upsertError } = await supabase.from("users").upsert(
    {
      auth_id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl ?? null,
      target_role: role,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "auth_id" },
  );

  if (upsertError) {
    if (__DEV__) console.error("[ensureUserProfileExists] upsert failed", upsertError);
  }
};
