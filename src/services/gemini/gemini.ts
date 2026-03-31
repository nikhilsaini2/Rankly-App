const GEMINI_MODEL = "gemini-2.5-flash";

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
    console.error("[Gemini API] Error details:", {
      status: res.status,
      statusText: res.statusText,
      errorBody: errText,
      model: GEMINI_MODEL,
      url: url.replace(/\?.*$/, ""), // Hide API key in logs
    });

    // Provide specific error messages based on status code
    if (res.status === 400) {
      throw new Error(
        "Gemini API: Invalid request. The prompt may be malformed.",
      );
    } else if (res.status === 401) {
      throw new Error(
        "Gemini API: Invalid API key. Check your EXPO_PUBLIC_GEMINI_API_KEY.",
      );
    } else if (res.status === 429) {
      throw new Error(
        "Gemini API: Rate limit exceeded. Please wait and try again.",
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

  console.log("[Gemini API] Response structure:", {
    hasCandidates: !!data.candidates,
    candidatesCount: data.candidates?.length,
    firstCandidate: data.candidates?.[0] ? "present" : "missing",
    firstContent: data.candidates?.[0]?.content ? "present" : "missing",
    firstParts: data.candidates?.[0]?.content?.parts ? "present" : "missing",
    partsCount: data.candidates?.[0]?.content?.parts?.length,
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    console.error(
      "[Gemini API] Empty response, full data:",
      JSON.stringify(data, null, 2),
    );
    throw new Error("Empty response from Gemini");
  }

  console.log(
    "[Gemini API] Response preview:",
    text.slice(0, 200) + (text.length > 200 ? "..." : ""),
  );
  return text;
}
