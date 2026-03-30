const GEMINI_MODEL = "gemini-2.5-flash-lite";

let apiKeyLogged = false;

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKeyLogged) {
    apiKeyLogged = true;
  }
  if (!key) {
    throw new Error(
      "Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env for AI features.",
    );
  }
  return key;
}

export {
  extractJsonPayload,
  parseGeminiJson,
} from "../../utils/gemini";

export type GeminiChatTurn = {
  role: "user" | "model";
  text: string;
};

export async function generateGeminiText(prompt: string): Promise<string> {
  return generateGeminiRequest({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
}

type GenerateParams = {
  systemInstruction?: string;
  userMessage: string;
  history?: GeminiChatTurn[];
};

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
  if (!GEMINI_MODEL.includes("gemini")) {
    throw new Error("Invalid Gemini model configured");
  }

  const key = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const requestBody: Record<string, unknown> = {
    contents: body.contents,
  };
  if (body.systemInstruction) {
    // Your Gemini REST endpoint currently rejects `systemInstruction`/`system_instruction`
    // as an unknown JSON field. To keep the exact same system prompt content,
    // prepend it into the conversation as the first `user` message.
    requestBody.contents = [
      {
        role: "user",
        parts: [{ text: body.systemInstruction }],
      },
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
    throw new Error(`Gemini request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}
