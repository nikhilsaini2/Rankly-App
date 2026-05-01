import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useState } from "react";
import {
  generateGeminiTextWithRetry,
  parseGeminiJson,
} from "../services/gemini";
import { buildAtsScorePrompt } from "../services/gemini/prompts";
import { supabase } from "../services/supabase/supabase";
import type { AtsScoreRow } from "../types/common.types";
import { emitGeminiErrorToast } from "../utils/geminiToastBridge";

type GeminiAts = {
  overall_score: number;
  keyword_score?: number;
  format_score?: number;
  content_score?: number;
  readability_score?: number;
  keywords_found?: string[];
  keywords_missing?: string[];
  ai_summary?: string;
  feedback?: { strengths?: string[]; improvements?: string[] };
};

function mapDbToAts(r: Record<string, unknown>): AtsScoreRow {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    resumeId: (r.resume_id as string) ?? null,
    overallScore: r.overall_score as number,
    keywordScore: (r.keyword_score as number) ?? null,
    formatScore: (r.format_score as number) ?? null,
    contentScore: (r.content_score as number) ?? null,
    readabilityScore: (r.readability_score as number) ?? null,
    feedback: (r.feedback as AtsScoreRow["feedback"]) ?? null,
    keywordsFound: (r.keywords_found as string[]) ?? null,
    keywordsMissing: (r.keywords_missing as string[]) ?? null,
    aiSummary: (r.ai_summary as string) ?? null,
    createdAt: r.created_at as string,
  };
}

function parseAtsResponse(raw: string): GeminiAts {
  console.log(
    "[scoreResume] Raw Gemini response (first 500 chars):",
    raw.slice(0, 500),
  );

  try {
    const parsed = parseGeminiJson<GeminiAts>(raw);

    // Validate the one truly required field
    if (
      typeof parsed.overall_score !== "number" ||
      parsed.overall_score < 0 ||
      parsed.overall_score > 100
    ) {
      throw new Error(
        `Invalid overall_score: ${parsed.overall_score}. Must be 0-100.`,
      );
    }

    // Apply safe fallbacks for optional fields Gemini sometimes omits
    return {
      overall_score: parsed.overall_score,
      keyword_score: parsed.keyword_score ?? parsed.overall_score,
      format_score: parsed.format_score ?? parsed.overall_score,
      content_score: parsed.content_score ?? parsed.overall_score,
      readability_score: parsed.readability_score ?? parsed.overall_score,
      keywords_found: parsed.keywords_found ?? [],
      keywords_missing: parsed.keywords_missing ?? [],
      ai_summary: parsed.ai_summary || "Resume analyzed successfully.",
      feedback: {
        strengths: parsed.feedback?.strengths ?? [],
        improvements: parsed.feedback?.improvements ?? [],
      },
    };
  } catch (parseError) {
    console.error("[scoreResume] JSON parse failed:", {
      error:
        parseError instanceof Error ? parseError.message : String(parseError),
      rawResponse: raw.slice(0, 1000),
    });
    throw new Error("AI response was unclear. Please try again.");
  }
}

async function extractTextFromStorageFile(
  fileUrl: string,
  fileName: string,
): Promise<string> {
  console.log("[extractTextFromStorageFile] Downloading file:", fileName);

  // Get signed URL from Supabase Storage
  const { data } = await supabase.storage
    .from("resumes")
    .createSignedUrl(fileUrl, 60); // 60 seconds expiry

  const signedUrl = data?.signedUrl;
  if (!signedUrl) {
    throw new Error("Could not get signed URL for file");
  }

  // Download the file to a temp path and read as base64
  // FileReader is not reliable on real Android devices (Hermes engine)
  const tempPath = `${FileSystem.cacheDirectory}resume_${Date.now()}.pdf`;
  const downloadResult = await FileSystem.downloadAsync(signedUrl, tempPath);

  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download file: ${downloadResult.status}`);
  }

  const base64 = await FileSystem.readAsStringAsync(tempPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Clean up temp file (non-blocking)
  FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_ERROR");
  }

  const mimeType = fileName?.endsWith(".pdf")
    ? "application/pdf"
    : "application/octet-stream";

  console.log(
    "[extractTextFromStorageFile] Sending to Gemini for extraction...",
  );

  // Wrap only the Gemini fetch and response parsing — let all other errors propagate naturally
  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: base64 } },
                {
                  text: "Extract all text from this resume document. Return only the plain text content exactly as it appears — no formatting, no commentary, no JSON. Just the raw text of the resume.",
                },
              ],
            },
          ],
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text().catch(() => "");
      console.error(
        "[extractTextFromStorageFile] Gemini HTTP error:",
        geminiResponse.status,
        errBody,
      );
      throw new Error("GEMINI_API_ERROR");
    }

    const geminiData = await geminiResponse.json();
    const extractedText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!extractedText || extractedText.trim().length === 0) {
      console.error(
        "[extractTextFromStorageFile] Gemini returned empty text. Full response:",
        JSON.stringify(geminiData).slice(0, 500),
      );
      throw new Error("GEMINI_API_ERROR");
    }

    console.log(
      "[extractTextFromStorageFile] Extracted text length:",
      extractedText.length,
    );
    console.log(
      "[extractTextFromStorageFile] Text preview:",
      extractedText.slice(0, 200) + (extractedText.length > 200 ? "..." : ""),
    );

    return extractedText;
  } catch (err) {
    console.error("[extractTextFromStorageFile] Gemini call failed:", err);
    emitGeminiErrorToast(err);
    throw new Error("GEMINI_API_ERROR");
  }
}

export function useAtsScore() {
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<AtsScoreRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scoreResume = useCallback(
    async (resumeId: string, jobDescription?: string) => {
      setScoring(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");

        const { data: res, error: rErr } = await supabase
          .from("resumes")
          .select("*")
          .eq("id", resumeId)
          .eq("user_id", user.id)
          .single();
        if (rErr || !res) throw rErr ?? new Error("Resume not found");

        console.log("[scoreResume] Resume record:", {
          id: res.id,
          fileName: res.file_name,
          hasExtractedText: !!res.extracted_text,
          extractedTextLength: res.extracted_text?.length || 0,
          extractedTextPreview: res.extracted_text?.slice(0, 200) || "NULL",
          status: res.status,
        });

        let resumeContent = (res.extracted_text as string) || "";

        // If no extracted text, extract it now
        if (!resumeContent) {
          console.warn(
            "[scoreResume] extracted_text is empty - extracting from PDF now",
          );

          resumeContent = await extractTextFromStorageFile(
            res.file_url as string,
            (res.file_name as string) || "resume.pdf",
          );

          // Save extracted text and update status
          console.log(
            "[scoreResume] Saving extracted text and updating status...",
          );
          const { error: updateError } = await supabase
            .from("resumes")
            .update({
              extracted_text: resumeContent,
              status: "analyzed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", resumeId);

          if (updateError) {
            console.warn(
              "[scoreResume] Failed to save extracted text:",
              updateError.message,
            );
            // Don't fail the whole process - we still have the text for scoring
          } else {
            console.log(
              "[scoreResume] Successfully saved extracted text and updated status",
            );
          }
        } else {
          // Update status to 'analyzed' even if we already had text
          if (res.status === "uploaded") {
            await supabase
              .from("resumes")
              .update({ status: "analyzed" })
              .eq("id", resumeId);
          }
        }

        console.log(
          "[scoreResume] Final resume content length:",
          resumeContent.length,
        );
        console.log(
          "[scoreResume] Content preview:",
          resumeContent.slice(0, 200) +
            (resumeContent.length > 200 ? "..." : ""),
        );

        const prompt = buildAtsScorePrompt(
          resumeContent,
          (res.file_name as string) || "resume.pdf",
          jobDescription,
        );
        console.log("[scoreResume] Prompt built, sending to Gemini...");

        const raw = await generateGeminiTextWithRetry(prompt, 1, 3000);
        console.log(
          "[scoreResume] Gemini API Response preview:",
          raw.slice(0, 500),
        );
        console.log("[scoreResume] Gemini response received, parsing...");
        const parsed = parseAtsResponse(raw);

        // Validate and cap scores at 100
        const validatedScore = Math.min(100, Math.max(0, parsed.overall_score));
        const validatedKeywordScore = Math.min(
          100,
          Math.max(0, parsed.keyword_score || validatedScore),
        );
        const validatedFormatScore = Math.min(
          100,
          Math.max(0, parsed.format_score || validatedScore),
        );
        const validatedContentScore = Math.min(
          100,
          Math.max(0, parsed.content_score || validatedScore),
        );
        const validatedReadabilityScore = Math.min(
          100,
          Math.max(0, parsed.readability_score || validatedScore),
        );

        const insert = {
          user_id: user.id,
          resume_id: resumeId,
          job_description: jobDescription ?? null,
          overall_score: Math.round(validatedScore),
          keyword_score: Math.round(validatedKeywordScore),
          format_score: Math.round(validatedFormatScore),
          content_score: Math.round(validatedContentScore),
          readability_score: Math.round(validatedReadabilityScore),
          feedback: parsed.feedback ?? { strengths: [], improvements: [] },
          keywords_found: parsed.keywords_found ?? [],
          keywords_missing: parsed.keywords_missing ?? [],
          ai_summary: parsed.ai_summary ?? "",
        };

        console.log("[scoreResume] Final scores being saved:", {
          overall: validatedScore,
          keyword: validatedKeywordScore,
          format: validatedFormatScore,
          content: validatedContentScore,
          readability: validatedReadabilityScore,
        });

        console.log("[scoreResume] Inserting ATS score:", {
          user_id: user.id,
          resume_id: resumeId,
          overall_score: Math.round(parsed.overall_score),
          hasJobDescription: !!jobDescription,
        });

        const { data: row, error: sErr } = await supabase
          .from("ats_scores")
          .insert(insert)
          .select()
          .single();
        if (sErr || !row) {
          console.error("[scoreResume] Database insert failed:", {
            error: sErr,
            insertPayload: insert,
          });
          throw sErr ?? new Error("Could not save score");
        }

        console.log("[scoreResume] ATS score saved successfully:", row.id);

        console.log("[scoreResume] Caching score to resume table...");
        const { error: updateError } = await supabase
          .from("resumes")
          .update({
            latest_score: row.overall_score, // Use DB-returned value, not parsed
            latest_score_id: row.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", resumeId);

        if (updateError) {
          console.warn(
            "[scoreResume] Failed to cache score on resume row:",
            updateError.message,
          );
          // Non-fatal - score was saved successfully
        } else {
          console.log(
            "[scoreResume] Successfully cached score to resume table",
          );
        }

        const mapped = mapDbToAts(row as Record<string, unknown>);
        setScore(mapped);
        return mapped;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[scoreResume] FULL ERROR:", {
          message,
          error: e,
          resumeId,
          userId: "unknown",
        });

        // Map specific errors to user-friendly messages
        let userMessage = "Could not score resume";
        if (message.includes("Not signed in")) {
          userMessage = "Please sign in again to score your resume.";
        } else if (message.includes("EMPTY_RESUME")) {
          userMessage =
            "Could not read your resume content. Please delete and re-upload the file.";
        } else if (message.includes("Gemini API: Invalid API key")) {
          userMessage =
            "AI service configuration error. Please contact support.";
        } else if (message.includes("Gemini API: Rate limit")) {
          userMessage =
            "AI service is busy. Please wait 30 seconds and try again.";
        } else if (message.includes("Gemini API: Invalid request")) {
          userMessage =
            "Resume content could not be processed. Try re-uploading the file.";
        } else if (message.includes("Database save failed")) {
          userMessage =
            "Score was generated but could not be saved. Please try again.";
        } else if (message.includes("AI response was unclear")) {
          userMessage = "AI response was unclear. Please try again.";
        } else if (message.includes("Resume not found")) {
          userMessage = "Resume not found. Please refresh and try again.";
        }

        setError(userMessage);
        emitGeminiErrorToast(e);
        throw e;
      } finally {
        setScoring(false);
      }
    },
    [],
  );

  const getLatestScore = useCallback(async (resumeId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { data, error: qErr } = await supabase
      .from("ats_scores")
      .select("*")
      .eq("resume_id", resumeId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!data) return null;
    const mapped = mapDbToAts(data as Record<string, unknown>);
    setScore(mapped);
    return mapped;
  }, []);

  const getScoreById = useCallback(async (scoreId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { data, error: qErr } = await supabase
      .from("ats_scores")
      .select("*")
      .eq("id", scoreId)
      .eq("user_id", user.id)
      .single();
    if (qErr) throw qErr;
    if (!data) return null;
    return mapDbToAts(data as Record<string, unknown>);
  }, []);

  const getScoreHistory = useCallback(async (userId: string) => {
    const { data, error: qErr } = await supabase
      .from("ats_scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (qErr) throw qErr;
    return (data ?? []).map((r) => mapDbToAts(r as Record<string, unknown>));
  }, []);

  return {
    scoring,
    score,
    error,
    scoreResume,
    getLatestScore,
    getScoreById,
    getScoreHistory,
  };
}
