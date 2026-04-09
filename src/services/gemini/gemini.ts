import { GenerateParams } from "../../types";
import { supabase } from "../supabase/supabase";

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

async function generateGeminiRequest(body: {
  systemInstruction?: string;
  contents: { role: string; parts: { text: string }[] }[];
}): Promise<string> {
  const key = await getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const requestBody: Record<string, unknown> = {
    contents: body.contents,
  };

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
    console.error("[Gemini API] Error:", {
      status: res.status,
      errorBody: errText,
    });

    if (res.status === 401) {
      clearApiKeyCache();
      throw new Error(
        "Gemini API: Invalid API key. Update it in Supabase app_config.",
      );
    } else if (res.status === 400) {
      throw new Error(
        "Gemini API: Invalid request. The prompt may be malformed.",
      );
    } else if (res.status === 429) {
      clearApiKeyCache();
      throw new Error(
        "Gemini API: Rate limit exceeded. Update key in Supabase if needed.",
      );
    } else if (res.status >= 500) {
      throw new Error(
        "Gemini API: Service temporarily unavailable. Please try again later.",
      );
    } else {
      throw new Error(
        `Gemini request failed: ${res.status} - ${errText.slice(0, 200)}`,
      );
    }
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    console.error(
      "[Gemini API] Empty response:",
      JSON.stringify(data, null, 2),
    );
    throw new Error("Empty response from Gemini");
  }

  return text;
}
