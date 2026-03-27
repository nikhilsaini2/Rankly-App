import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { RegisterPayload } from "../../types/common.types";
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

export const handleUserProfile = async (user: any) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) return;

  const email = user.email;

  const fullName = user.user_metadata?.full_name || "";
  const [firstName, lastName] = fullName.split(" ");

  const safeFirstName =
    firstName || email?.split("@")[0]?.split(".")[0] || "User";

  const { error: insertError } = await supabase.from("users").insert({
    auth_id: user.id,
    email,
    first_name: safeFirstName,
    last_name: lastName || "",
    target_role: "SWE",
  });

  if (insertError) throw insertError;
};
