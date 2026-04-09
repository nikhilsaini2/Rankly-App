import { useState } from "react";
import { generateGeminiText, parseGeminiJson } from "../services/gemini/gemini";

export function useGemini() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateText(prompt: string): Promise<string> {
    setLoading(true);
    setError(null);
    try {
      return await generateGeminiText(prompt);
    } catch (e) {
      handleGeminiError(e, () => generateText(prompt));
      const msg = e instanceof Error ? e.message : "AI request failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function generateJson<T>(prompt: string): Promise<T> {
    const text = await generateText(prompt);
    try {
      return parseGeminiJson<T>(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid AI JSON";
      setError(msg);
      throw e;
    }
  }

  return { loading, error, generateText, generateJson, parseGeminiJson };
}
