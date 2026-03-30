/**
 * Strips markdown code fences and extracts the first JSON object/array
 * from a Gemini response string.
 */
export function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1).trim();
  }
  const arrStart = trimmed.indexOf('[');
  const arrEnd = trimmed.lastIndexOf(']');
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
    throw new Error('Could not parse JSON from model response');
  }
}
