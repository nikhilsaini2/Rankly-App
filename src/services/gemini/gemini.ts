import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerateParams } from "../../types";
import { supabase } from "../supabase/supabase";

export class GeminiError extends Error {
  constructor(
    public readonly code:
      | "invalid_key"
      | "invalid_request"
      | "rate_limit"
      | "unavailable"
      | "server_error"
      | "empty_response"
      | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

// ─── Model config ────────────────────────────────────────────
// gemini-2.5-flash-lite: highest free tier RPD (1000/day), 15 RPM, best availability
const PRIMARY_MODEL = "gemini-2.5-flash-lite";
// Use v1 endpoint (not v1beta) — higher quota limits, same model availability
const API_VERSION = "v1";

let cachedApiKey: string = "";

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "gemini_api_key")
    .single();

  if (error || !data?.value) {
    console.error(
      "[Gemini] Failed to fetch API key from Supabase:",
      error?.message,
    );
    const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!envKey) throw new Error("No Gemini API key found in Supabase or .env");
    return envKey;
  }

  cachedApiKey = data.value;
  return cachedApiKey;
}

export function clearApiKeyCache() {
  cachedApiKey = "";
}

export function clearResponseCache() {
  responseCache.clear();
}

export { extractJsonPayload, parseGeminiJson } from "../../utils/gemini";

export type GeminiChatTurn = {
  role: "user" | "model";
  text: string;
};

// ─── Global rate limiter ──────────────────────────────────────
// Free tier: 15 RPM — 1 request per 4s is safe
let lastRequestTime = 0;
const MIN_REQUEST_GAP_MS = 1000; // 1s gap — extraction uses direct fetch, scoring uses SDK
const requestQueue: Array<() => void> = [];
let isProcessingQueue = false;

async function waitForRateLimit(): Promise<void> {
  return new Promise((resolve) => {
    requestQueue.push(resolve);
    if (!isProcessingQueue) processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue) return; // already running — don't double-enter
  isProcessingQueue = true;
  try {
    while (requestQueue.length > 0) {
      const now = Date.now();
      const elapsed = now - lastRequestTime;
      if (elapsed < MIN_REQUEST_GAP_MS) {
        await new Promise((res) => setTimeout(res, MIN_REQUEST_GAP_MS - elapsed));
      }
      const next = requestQueue.shift();
      if (next) {
        lastRequestTime = Date.now();
        next();
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

// ─── Response cache ───────────────────────────────────────────
// Response cache - Caches results for 5 minutes - prevents duplicate calls on re-renders
const responseCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-flight deduplication - prevents duplicate API calls for identical prompts
const inFlightRequests = new Map<string, Promise<string>>();

function getCached(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCached(key: string, value: string): void {
  // Keep cache small — evict oldest if over 20 entries
  if (responseCache.size >= 20) {
    const oldest = Array.from(responseCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    )[0];
    if (oldest) responseCache.delete(oldest[0]);
  }
  responseCache.set(key, { result: value, timestamp: Date.now() });
}

function makeCacheKey(prompt: string): string {
  // Use full prompt hash instead of truncation to avoid collisions
  // Simple djb2 hash - fast, no dependencies
  let hash = 5381;
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) + hash) ^ prompt.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return `${hash}_${prompt.length}`;
}

// ─── Core text generation ─────────────────────────────────────
export async function generateGeminiText(
  prompt: string,
  modelName: string = PRIMARY_MODEL,
): Promise<string> {
  const cacheKey = makeCacheKey(prompt);

  // 1. Return from cache immediately if available
  const cached = getCached(cacheKey);
  if (cached) {
    console.log("[Gemini] cache hit");
    return cached;
  }

  // 2. If this exact prompt is already in-flight, wait for it - do NOT fire again
  const existing = inFlightRequests.get(cacheKey);
  if (existing) {
    console.log("[Gemini] dedup - reusing in-flight request");
    return existing;
  }

  // 3. Fire exactly one API call
  const requestPromise = (async () => {
    await waitForRateLimit();
    const apiKey = await getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel(
      {
        model: modelName,
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        },
      },
      { apiVersion: API_VERSION },
    );

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text || text.trim().length === 0) {
      throw new GeminiError(
        "empty_response",
        "AI returned an empty response. Please try again.",
      );
    }

    const trimmed = text.trim();
    // Only cache if response looks complete (contains closing brace for JSON responses)
    const looksComplete = !trimmed.endsWith(",") && !trimmed.endsWith("[") && !trimmed.endsWith("{");
    if (looksComplete) {
      setCached(cacheKey, trimmed);
    }
    return trimmed;
  })();

  // Register in-flight - auto-removes when settled (success or error)
  inFlightRequests.set(cacheKey, requestPromise);
  requestPromise.finally(() => inFlightRequests.delete(cacheKey));

  return requestPromise;
}

// ───
// ───// Helper to parse retry delay from 429 error message
function parseRetryDelayMs(errorMessage: string): number | null {
  // Gemini 429 response body contains: "Please retry in 51.62195941s"
  const match = errorMessage.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (match) {
    const seconds = parseFloat(match[1]);
    return Math.ceil(seconds) * 1000 + 2000; // add 2s safety buffer
  }
  return null;
}

// With retry + fallback (use this in voice interview) ------
export async function generateGeminiTextWithRetry(
  prompt: string,
  maxRetries = 2,
  baseDelayMs = 4000,
): Promise<string> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateGeminiText(prompt);
    } catch (error: any) {
      lastError = error;
      const message = error?.message ?? "";
      const msgLower = message.toLowerCase();

      const isQuotaError =
        msgLower.includes("429") ||
        msgLower.includes("quota") ||
        msgLower.includes("resource_exhausted");

      if (isQuotaError) throw error; // never retry quota errors

      const isRetryable =
        msgLower.includes("503") ||
        msgLower.includes("500") ||
        msgLower.includes("network") ||
        msgLower.includes("fetch failed") ||
        msgLower.includes("econnreset") ||
        msgLower.includes("etimedout");

      if (!isRetryable || attempt === maxRetries) throw error;

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(
        `[Gemini] attempt ${attempt + 1}/${maxRetries + 1} failed - retrying in ${Math.round(delay / 1000)}s`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw lastError;
}

export async function generateGeminiWithContext(
  params: GenerateParams,
): Promise<string> {
  const apiKey = await getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel(
    {
      model: PRIMARY_MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    },
    { apiVersion: API_VERSION },
  );

  // CRITICAL: Sanitize history before passing to Gemini SDK
  // Rules:
  //   1. Must start with 'user' role
  //   2. Must strictly alternate user -> model -> user -> model
  //   3. Must NOT include the current userMessage (sent separately via sendMessage)
  //   4. Must end with 'model' role (last assistant reply)
  const rawHistory = params.history ?? [];

  // Step 1: Remove any trailing 'user' entries (those belong in sendMessage, not history)
  // Step 2: Ensure history starts with 'user'
  // Step 3: Deduplicate consecutive same-role entries (keep last of each run)
  const sanitizedHistory: {
    role: "user" | "model";
    parts: { text: string }[];
  }[] = [];

  for (const turn of rawHistory) {
    const role = turn.role === "model" ? "model" : "user";
    const last = sanitizedHistory[sanitizedHistory.length - 1];
    if (last && last.role === role) {
      // Merge consecutive same-role turns by replacing with latest
      sanitizedHistory[sanitizedHistory.length - 1] = {
        role,
        parts: [{ text: turn.text }],
      };
    } else {
      sanitizedHistory.push({ role, parts: [{ text: turn.text }] });
    }
  }

  // Must start with 'user' - drop leading model entries
  while (sanitizedHistory.length > 0 && sanitizedHistory[0].role !== "user") {
    sanitizedHistory.shift();
  }

  // Must end with 'model' - drop trailing user entries
  // (the current user message is sent via sendMessage below)
  while (
    sanitizedHistory.length > 0 &&
    sanitizedHistory[sanitizedHistory.length - 1].role !== "model"
  ) {
    sanitizedHistory.pop();
  }

  const chat = model.startChat({
    history: [
      // Inject system instruction as first user+model turn (v1 compatible)
      ...(params.systemInstruction
        ? [
            { role: "user" as const, parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${params.systemInstruction}` }] },
            { role: "model" as const, parts: [{ text: "Understood. I will follow these instructions for all responses." }] },
          ]
        : []),
      ...sanitizedHistory,
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
    },
  });

  let chatResult: Awaited<ReturnType<typeof chat.sendMessage>> | undefined;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      chatResult = await chat.sendMessage(params.userMessage);
      break;
    } catch (err: any) {
      const msg = (err?.message ?? "").toLowerCase();
      const isQuota =
        msg.includes("429") ||
        msg.includes("quota") ||
        msg.includes("resource_exhausted");
      const is503 =
        msg.includes("503") ||
        msg.includes("high demand") ||
        msg.includes("overloaded");

      if (isQuota || (!is503 && attempt === 0) || attempt === 2) throw err;

      const delay = attempt === 0 ? 4000 : 8000;
      console.warn(
        `[Gemini] chat 503 attempt ${attempt + 1}/3 - retrying in ${delay / 1000}s`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  const response = chatResult!.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new GeminiError(
      "empty_response",
      "AI returned an empty response. Please try again.",
    );
  }

  return text.trim();
}

// ─── Quota error helpers ───────────────────────────────────────
export function isGeminiQuotaError(error: any): boolean {
  const msg = error?.message?.toLowerCase() ?? "";
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("free_tier") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit")
  );
}

export function getGeminiErrorMessage(error: any): string {
  if (isGeminiQuotaError(error)) {
    return "AI is currently busy. Please wait a moment and try again.";
  }
  if (error?.message?.includes("TIMEOUT")) {
    return "Request timed out. Please check your connection.";
  }
  return "Something went wrong. Please try again.";
}

// ─── Quota status indicator (dev mode) ───────────────────────
let consecutiveQuotaErrors = 0;

// Call this in catch blocks to track quota issues
export function trackQuotaError(error: any): void {
  if (isGeminiQuotaError(error)) {
    consecutiveQuotaErrors++;
    if (consecutiveQuotaErrors >= 2) {
      console.error(
        `[Gemini] ⚠️ ${consecutiveQuotaErrors} consecutive quota errors. ` +
          `Check https://ai.google.dev/gemini-api/docs/rate-limits — ` +
          `consider upgrading to pay-as-you-go ($0.075/1M tokens for Flash).`,
      );
    }
  } else {
    consecutiveQuotaErrors = 0; // Reset on success
  }
}

// Dev helper — call this once on app start to verify API is working
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const result = await generateGeminiText(
      "Reply with single word: OK",
      PRIMARY_MODEL,
    );
    console.log("[Gemini] ✅ connected via", PRIMARY_MODEL, "→", result);
    consecutiveQuotaErrors = 0; // Reset on success
    return true;
  } catch (error: any) {
    console.error("[Gemini] ❌ connection failed:", error?.message);
    trackQuotaError(error);
    return false;
  }
}
