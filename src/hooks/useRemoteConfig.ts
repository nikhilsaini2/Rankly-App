// services/config/useRemoteConfig.ts
import { supabase } from "../services/supabase/supabase";

let cachedKey: string = "";

export async function getGeminiApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "gemini_api_key")
    .single();

  if (error || !data?.value) {
    console.error("[config] Failed to fetch gemini key:", error?.message);
    // fallback to .env if remote fetch fails
    return process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";
  }

  cachedKey = data.value;
  return cachedKey;
}

// Call this to bust cache when you update the key in Supabase
export function clearConfigCache() {
  cachedKey = "";
}
