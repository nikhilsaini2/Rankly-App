/**
 * Maps raw Google Sign-In / Supabase OAuth error messages to
 * simple, user-friendly strings. Never expose SDK internals to users.
 */
export function getGoogleAuthErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : String(err ?? "");

  const msg = raw.toLowerCase();

  // User cancelled the sign-in sheet
  if (
    msg.includes("sign_in_cancelled") ||
    msg.includes("cancelled") ||
    msg.includes("canceled") ||
    msg.includes("user cancelled") ||
    msg.includes("user canceled")
  ) {
    return "Sign-in was cancelled. Tap the button to try again.";
  }

  // No Google account on device / play services missing
  if (
    msg.includes("sign_in_failed") ||
    msg.includes("play services") ||
    msg.includes("google play")
  ) {
    return "Google sign-in is unavailable on this device. Please use email instead.";
  }

  // Network / connectivity issues
  if (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("connection") ||
    msg.includes("fetch")
  ) {
    return "No internet connection. Please check your network and try again.";
  }

  // Session / token not ready (the "getTokens requires a user to be signed in" case)
  if (
    msg.includes("gettokens") ||
    msg.includes("get_tokens") ||
    msg.includes("session not established") ||
    msg.includes("requires a user to be signed in") ||
    msg.includes("no session")
  ) {
    return "Sign-in timed out. Please try again.";
  }

  // Account already exists with a different provider
  if (
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("email already")
  ) {
    return "An account with this email already exists. Try signing in with email instead.";
  }

  // Generic / unknown — keep it simple
  return "Something went wrong with Google sign-in. Please try again.";
}
