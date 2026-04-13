import {
  generateGeminiTextWithRetry,
  parseGeminiJson,
} from "../../../services/gemini";
import {
  buildInterviewQuestionsPrompt,
} from "../../../services/gemini/prompts";
import type { Answer, SessionConfig } from "../types/interview.types";

function parseQuestionList(raw: string): string[] {
  const parsed = parseGeminiJson<unknown>(raw);

  if (Array.isArray(parsed)) {
    return parsed.filter((x): x is string => typeof x === "string");
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "questions" in parsed &&
    Array.isArray((parsed as { questions: unknown }).questions)
  ) {
    return (parsed as { questions: string[] }).questions.filter(
      (x) => typeof x === "string",
    );
  }

  throw new Error("Failed to parse questions from AI response");
}

export async function generateQuestions(config: SessionConfig): Promise<string[]> {
  const prompt = buildInterviewQuestionsPrompt(
    config.role,
    config.difficulty,
    config.sessionType,
    config.questionCount,
  );

  const raw = await generateGeminiTextWithRetry(prompt, 1);
  const list = parseQuestionList(raw).slice(0, config.questionCount);

  if (list.length === 0) {
    throw new Error("AI returned no valid questions");
  }

  return list;
}

interface RawFeedback {
  score: number;
  overall: string;
  strengths: string[];
  improvements: string[];
  tip: string;
}

export async function evaluateAnswer(
  question: string,
  transcript: string,
  role: string,
  difficulty: string,
): Promise<Answer> {
  const cleanTranscript = transcript.trim();

  if (!cleanTranscript || cleanTranscript.length < 3) {
    return {
      question,
      transcript: "(No answer recorded)",
      score: 0,
      overall: "No answer was detected for this question.",
      strengths: [],
      improvements: ["Provide a substantive answer"],
      tip: "Try to give a detailed response using specific examples.",
    };
  }

  const q = question.slice(0, 200);
  const a = cleanTranscript.slice(0, 400);

  const prompt = `Evaluate this interview answer for role of ${role} (${difficulty} difficulty).
Reply ONLY valid JSON, no markdown fences.

Question: ${q}
Answer: ${a}

Format:
{"score":0-100,"overall":"2-3 sentences","strengths":["s1","s2"],"improvements":["i1","i2"],"tip":"1 sentence"}

Scoring: 90-100 exceptional, 70-89 strong, 50-69 average, 30-49 weak, 0-29 poor.
Be constructive and honest.`;

  try {
    const responseText = await Promise.race([
      generateGeminiTextWithRetry(prompt, 2),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 30000),
      ),
    ]);

    const cleaned = responseText.replace(/```json|```/g, "").trim();
    let parsed: RawFeedback;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse AI response");
      parsed = JSON.parse(match[0]);
    }

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));

    return {
      question,
      transcript: cleanTranscript,
      score,
      overall: parsed.overall || "Good effort overall.",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      tip: parsed.tip || "Keep practicing!",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    const isRateLimit =
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("resource_exhausted");

    return {
      question,
      transcript: cleanTranscript,
      score: 0,
      overall: isRateLimit
        ? "AI was temporarily busy — answer recorded, score unavailable."
        : "Evaluation failed — answer was recorded.",
      strengths: [],
      improvements: [],
      tip: "Try submitting again later for AI feedback.",
    };
  }
}
