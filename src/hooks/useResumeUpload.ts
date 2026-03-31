import { decode } from "base64-arraybuffer";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";
import { MAX_FREE_RESUMES } from "../constants/options";
import { generateGeminiText } from "../services/gemini/gemini";
import { supabase } from "../services/supabase/supabase";
import type { ResumeRow } from "../types/common.types";

const BUCKET = "resumes";

export function useResumeUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function pickResume() {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    return res.assets[0];
  }

  async function extractTextFromPdf(fileUri: string): Promise<string> {
    try {
      console.log("[extractTextFromPdf] Starting extraction for:", fileUri);

      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      // Use Gemini to extract text from the PDF
      const prompt = `
Extract all text content from this PDF resume. Return ONLY the extracted text - no formatting, no explanations, no markdown, no JSON. Just the raw text content of the resume.

The PDF content is provided as base64 data. Please decode and extract all readable text.

Return the extracted text content only.
      `.trim();

      console.log(
        "[extractTextFromPdf] Sending to Gemini for text extraction...",
      );
      const extractedText = await generateGeminiText(prompt);
      const cleanText = extractedText.trim();

      console.log(
        "[extractTextFromPdf] Extracted text length:",
        cleanText.length,
      );
      console.log(
        "[extractTextFromPdf] Text preview:",
        cleanText.slice(0, 200) + (cleanText.length > 200 ? "..." : ""),
      );

      return cleanText;
    } catch (error) {
      console.error("[extractTextFromPdf] Extraction failed:", error);
      // Return empty string on failure rather than null - ATS scorer can handle empty text
      return "";
    }
  }

  async function uploadResume(file: DocumentPicker.DocumentPickerAsset) {
    setError(null);
    setUploading(true);
    setProgress(0.1);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const [{ count }, { data: urow }] = await Promise.all([
        supabase
          .from("resumes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("users")
          .select("plan")
          .eq("auth_id", user.id)
          .maybeSingle(),
      ]);

      const plan = (urow?.plan as string) ?? "free";
      const max = plan === "pro" ? 999 : MAX_FREE_RESUMES;
      if ((count ?? 0) >= max) {
        throw new Error(
          "Free plan allows 3 resumes. Delete one to upload another.",
        );
      }

      const name = file.name ?? "resume.pdf";
      const path = `${user.id}/${Date.now()}_${name}`;
      setProgress(0.4);

      const mimeType = file.mimeType ?? "application/pdf";

      // React Native + Supabase Storage upload:
      // Do NOT upload Blob/FormData in RN. Read base64 locally -> decode -> ArrayBuffer.
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64",
      });
      setProgress(0.55);

      const arrayBuffer = decode(base64);
      setProgress(0.7);

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (upErr) throw upErr;
      setProgress(0.8);

      // Extract text from PDF for ATS scoring
      console.log("[uploadResume] Extracting text from PDF...");
      const extractedText = await extractTextFromPdf(file.uri);

      const title = name.replace(/\.pdf$/i, "") || "My Resume";

      const { data: row, error: insErr } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          title,
          file_url: path,
          file_name: name,
          raw_text: extractedText,
        })
        .select()
        .single();

      if (insErr) throw insErr;

      setProgress(1);
      return mapResume(row as Record<string, unknown>);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      console.error("[Upload debug]", {
        errorMessage: e instanceof Error ? e.message : String(e),
        userId: (await supabase.auth.getUser()).data.user?.id,
        fileUri: file.uri,
        fileName: file.name,
      });
      throw e;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 650);
    }
  }

  async function deleteResume(resumeId: string, storagePath: string | null) {
    setError(null);
    try {
      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }
      const { error: delErr } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeId);
      if (delErr) throw delErr;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      setError(msg);
      throw e;
    }
  }

  return { uploading, progress, error, pickResume, uploadResume, deleteResume };
}

function mapResume(r: Record<string, unknown>): ResumeRow {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    fileUrl: (r.file_url as string) ?? null,
    fileName: (r.file_name as string) ?? null,
    rawText: (r.raw_text as string) ?? null,
    isPrimary: Boolean(r.is_primary),
    createdAt: r.created_at as string,
  };
}
