import { RegisterPayload } from "../../types/common.types";
import { supabase } from "./supabase";

export const registerUser = async ({
  email,
  password,
  firstName,
  lastName,
  role,
}: RegisterPayload) => {
  try {
    console.log("🔍 Starting registration for:", email);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName, role },
      },
    });

    if (authError) {
      throw new Error(mapAuthError(authError.message, authError.code));
    }

    if (!authData.user) {
      throw new Error("User creation failed - no user returned");
    }
    return authData.user;
  } catch (err: any) {
    throw new Error(err.message || "Registration failed. Please try again.");
  }
};

function mapAuthError(message: string, code?: string): string {
  if (
    code === "user_already_exists" ||
    message.includes("already registered")
  ) {
    return "Email already in use";
  }

  if (code === "invalid_credentials") {
    return "Invalid email or password";
  }

  if (code === "validation_failed") {
    if (message.includes("email")) return "Invalid email format";
    if (message.includes("password"))
      return "Password is too weak (min 6 chars)";
  }

  if (code === "over_request_rate_limit") {
    return "Too many signup attempts. Please wait a moment.";
  }

  if (code === "invalid_email") {
    return "Invalid email address";
  }

  if (code === "weak_password") {
    return "Password must be at least 6 characters";
  }

  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("already registered") ||
    lowerMessage.includes("already exists")
  ) {
    return "Email already in use";
  }

  if (lowerMessage.includes("invalid email")) {
    return "Invalid email address";
  }

  if (lowerMessage.includes("password")) {
    return "Password must be at least 6 characters";
  }

  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return "Network error. Please check your connection.";
  }

  return `Registration failed: ${message}`;
}
