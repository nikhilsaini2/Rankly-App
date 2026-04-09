/**
 * Strips markdown code fences and extracts the first JSON object/array
 * from a Gemini response string.
 */
export function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1).trim();
  }
  const arrStart = trimmed.indexOf("[");
  const arrEnd = trimmed.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    return trimmed.slice(arrStart, arrEnd + 1).trim();
  }
  return trimmed;
}

/** Safely parses a Gemini JSON response, throwing on failure. */
export function parseGeminiJson<T>(raw: string): T {
  const s = extractJsonPayload(raw);
  try {
    return JSON.parse(s) as T;
  } catch {
    throw new Error("Could not parse JSON from model response");
  }
}

/** Handles Gemini errors with logging and user-friendly messages */
export function handleGeminiError(error: unknown, retryFn?: () => void) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[Gemini Error]", {
    message,
    error,
  });

  // Map specific errors to user-friendly messages
  let userMessage = "An error occurred";
  if (message.includes("Not signed in")) {
    userMessage = "Please sign in again.";
  } else if (message.includes("Gemini API: Invalid API key")) {
    userMessage = "AI service configuration error. Please contact support.";
  } else if (message.includes("Gemini API: Rate limit")) {
    userMessage = "AI service is busy. Please wait and try again.";
  } else if (message.includes("Gemini API: Invalid request")) {
    userMessage = "Request could not be processed. Please try again.";
  } else if (message.includes("AI response was unclear")) {
    userMessage = "AI response was unclear. Please try again.";
  }

  if (retryFn) {
    retryFn();
  } else {
    throw new Error(userMessage);
  }
}
