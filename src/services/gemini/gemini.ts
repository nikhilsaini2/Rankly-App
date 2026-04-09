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

const GEMINI_MODEL = "gemini-2.5-flash";
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

export { extractJsonPayload, parseGeminiJson } from "../../utils/gemini";

export type GeminiChatTurn = {
  role: "user" | "model";
  text: string;
};

export async function generateGeminiText(prompt: string): Promise<string> {
  return generateGeminiRequest({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
}

export async function generateGeminiWithContext(
  params: GenerateParams,
): Promise<string> {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const h of params.history ?? []) {
    contents.push({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: h.text }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: params.userMessage }],
  });

  return generateGeminiRequest({
    systemInstruction: params.systemInstruction,
    contents,
  });
}

async function generateGeminiRequest(
  body: {
    systemInstruction?: string;
    contents: { role: string; parts: { text: string }[] }[];
  },
  retries = 2,
): Promise<string> {
  const key = await getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const requestBody: Record<string, unknown> = { contents: body.contents };
  if (body.systemInstruction) {
    requestBody.contents = [
      { role: "user", parts: [{ text: body.systemInstruction }] },
      ...body.contents,
    ];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errText = await res.text();

    // Auto-retry on 503 with backoff
    if (res.status === 503 && retries > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return generateGeminiRequest(body, retries - 1);
    }

    if (res.status === 401) {
      clearApiKeyCache();
      throw new GeminiError(
        "invalid_key",
        "Invalid API key. Please try again later.",
      );
    } else if (res.status === 400) {
      throw new GeminiError(
        "invalid_request",
        "Request could not be processed. Please try again.",
      );
    } else if (res.status === 429) {
      clearApiKeyCache();
      throw new GeminiError(
        "rate_limit",
        "AI service is busy. Please wait a moment and try again.",
      );
    } else if (res.status === 503) {
      throw new GeminiError(
        "unavailable",
        "AI service is temporarily unavailable. Please try again in a few minutes.",
      );
    } else if (res.status === 500) {
      throw new GeminiError(
        "server_error",
        "AI service encountered an error. Please try again.",
      );
    } else {
      throw new GeminiError(
        "unknown",
        `Something went wrong (${res.status}). Please try again.`,
      );
    }
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text)
    throw new GeminiError(
      "empty_response",
      "AI returned an empty response. Please try again.",
    );

  return text;
}
