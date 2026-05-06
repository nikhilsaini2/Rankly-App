/**
 * Global Gemini error → Toast bridge.
 *
 * The Gemini service layer emits errors through this bridge.
 * The ToastProvider subscribes and shows a user-friendly toast automatically.
 * This avoids needing `useToast()` inside non-React service code.
 */

export const AI_LIMIT_RESET_NOTE = "The limit will reset tomorrow.";

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

export function isGeminiRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests")
  );
}

/** Trims Gemini/SDK noise for a short toast suffix (truncated). */
export function sanitizeGeminiErrorDetail(err: unknown, maxLen = 140): string {
  const raw = err instanceof Error ? err.message : String(err);
  const stripped = raw.replace(/^Gemini API:\s*/i, "").replace(/\s+/g, " ").trim();
  if (!stripped) return "";
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, Math.max(0, maxLen - 1)) + "…";
}

/** Appends `(detail)` when it adds information beyond the base sentence. */
function withOptionalDetail(base: string, err: unknown): string {
  const detail = sanitizeGeminiErrorDetail(err);
  if (!detail) return base;
  const baseLower = base.toLowerCase();
  const head = detail.toLowerCase().slice(0, 28);
  if (head.length >= 12 && baseLower.includes(head.slice(0, 12))) return base;
  return `${base} (${detail})`;
}

export type BuildGeminiToastOptions = { label?: string };

/** Maps any Gemini-related error to a single toast line (with optional API detail). */
export function buildGeminiErrorToastMessage(
  err: unknown,
  options?: BuildGeminiToastOptions,
): string {
  const label = options?.label ?? "AI";
  const prefix = `${label}:`;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (isGeminiRateLimitError(err)) {
    return withOptionalDetail(
      `${prefix} Usage limit reached. ${AI_LIMIT_RESET_NOTE}`,
      err,
    );
  }
  if (
    lower.includes("503") ||
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable")
  ) {
    return withOptionalDetail(
      `${prefix} Service temporarily unavailable. Please try again.`,
      err,
    );
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset")
  ) {
    return withOptionalDetail(
      `${prefix} Network error. Please check your connection and try again.`,
      err,
    );
  }
  if (lower.includes("api key") || lower.includes("invalid_key")) {
    return withOptionalDetail(
      `${prefix} Configuration error. Please try again later.`,
      err,
    );
  }
  if (lower.includes("empty_response") || lower.includes("empty response")) {
    return withOptionalDetail(
      `${prefix} No response from the model. Please try again.`,
      err,
    );
  }
  return withOptionalDetail(
    `${prefix} Something went wrong. Please try again.`,
    err,
  );
}

export function emitGeminiErrorToast(
  err: unknown,
  options?: BuildGeminiToastOptions,
): void {
  if (!_listener) return;

  // Prevent duplicate toasts from retry loops / cascading catches
  const now = Date.now();
  if (now - _lastToastTime < TOAST_COOLDOWN_MS) return;
  _lastToastTime = now;

  _listener(buildGeminiErrorToastMessage(err, options), "error");
}
