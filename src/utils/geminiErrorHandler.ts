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
  if (err instanceof GeminiError) {
    const title = ERROR_TITLES[err.code] ?? "AI Error";
    const subtitle = ERROR_SUBTITLES[err.code] ?? err.message;

    const buttons = onRetry
      ? [
          { text: "Cancel", style: "cancel" as const },
          { text: "Retry", onPress: onRetry },
        ]
      : [{ text: "OK" }];

    Alert.alert(`⚠️ ${title}`, subtitle, buttons);
  } else if (err instanceof Error) {
    Alert.alert("Error", err.message);
  }
}
