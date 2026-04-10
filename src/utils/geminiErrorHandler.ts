import { Alert } from "react-native";
import { GeminiError } from "../services/gemini/gemini";

const ERROR_TITLES: Record<string, string> = {
  rate_limit: "Too Many Requests",
  unavailable: "Service Unavailable",
  server_error: "Server Error",
  invalid_key: "Configuration Error",
  invalid_request: "Request Error",
  empty_response: "No Response",
  unknown: "Something Went Wrong",
};

const ERROR_SUBTITLES: Record<string, string> = {
  rate_limit: "The free AI tier has hit its limit. Try again in a minute.",
  unavailable:
    "Google's AI service is temporarily down - due to high demand. Please wait a moment and try again.",
  server_error: "Google's AI server returned an error. Please try again.",
  invalid_key: "There's a configuration issue on our end. We're on it.",
  invalid_request: "The request couldn't be processed. Please try again.",
  empty_response: "The AI returned no response. Please try again.",
  unknown: "An unexpected error occurred. Please try again.",
};

export function handleGeminiError(err: unknown, onRetry?: () => void): void {
  const normalized = normalizeGeminiError(err);

  const title = ERROR_TITLES[normalized.code] ?? "AI Error";
  const subtitle = ERROR_SUBTITLES[normalized.code] ?? normalized.message;

  const buttons = onRetry
    ? [
        { text: "Cancel", style: "cancel" as const },
        { text: "Retry", onPress: onRetry },
      ]
    : [{ text: "OK" }];

  Alert.alert(`⚠️ ${title}`, subtitle, buttons);
}

function normalizeGeminiError(err: unknown): GeminiError {
  if (err instanceof GeminiError) return err;

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes("503") ||
    lower.includes("high demand") ||
    lower.includes("overloaded")
  ) {
    return new GeminiError("unavailable", msg);
  }
  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit")
  ) {
    return new GeminiError("rate_limit", msg);
  }
  if (lower.includes("500")) {
    return new GeminiError("server_error", msg);
  }
  if (lower.includes("api key") || lower.includes("invalid_key")) {
    return new GeminiError("invalid_key", msg);
  }

  return new GeminiError("unknown", msg);
}
