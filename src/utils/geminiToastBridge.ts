/**
 * Global Gemini error → Toast bridge.
 *
 * The Gemini service layer emits errors through this bridge.
 * The ToastProvider subscribes and shows a user-friendly toast automatically.
 * This avoids needing `useToast()` inside non-React service code.
 */

type GeminiToastListener = (message: string, variant: "error" | "info") => void;

let _listener: GeminiToastListener | null = null;

/** Called once by ToastProvider to register itself as the global toast sink. */
export function registerGeminiToastListener(fn: GeminiToastListener) {
  _listener = fn;
}

/** Called once on ToastProvider unmount. */
export function unregisterGeminiToastListener() {
  _listener = null;
}

/**
 * Classifies any Gemini-related error and fires the global toast.
 * Safe to call from anywhere — if no listener is registered, it's a no-op.
 * Deduplicates — won't fire again within 3 seconds.
 */
let _lastToastTime = 0;
const TOAST_COOLDOWN_MS = 3000;

export function emitGeminiErrorToast(err: unknown): void {
  if (!_listener) return;

  // Prevent duplicate toasts from retry loops / cascading catches
  const now = Date.now();
  if (now - _lastToastTime < TOAST_COOLDOWN_MS) return;
  _lastToastTime = now;

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  let userMessage: string;

  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted")
  ) {
    userMessage = "AI is currently busy. Please try again in a moment.";
  } else if (
    lower.includes("503") ||
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable")
  ) {
    userMessage = "AI service is temporarily unavailable. Please try again.";
  } else if (lower.includes("network") || lower.includes("fetch failed") || lower.includes("econnreset")) {
    userMessage = "Network error. Please check your connection and try again.";
  } else if (lower.includes("api key") || lower.includes("invalid_key")) {
    userMessage = "AI service configuration error. Please try again later.";
  } else if (lower.includes("empty_response") || lower.includes("empty response")) {
    userMessage = "AI returned no response. Please try again.";
  } else {
    userMessage = "Something went wrong with AI. Please try again.";
  }

  _listener(userMessage, "error");
}
