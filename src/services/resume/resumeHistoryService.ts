import type {
  GeneratedResume,
  ResumeFormData,
  ResumeHistoryItem,
} from "../../feature/resume/types/resume.types";
import {
  deleteResume as deleteLocalResume,
  getAllResumes,
} from "./resumeHistoryStorage";
import { supabase } from "../supabase/supabase";

export interface ResumeHistoryRecord {
  id: string;
  source: "cloud" | "local";
  title: string;
  html: string | null;
  rawData: GeneratedResume;
  formData?: Partial<ResumeFormData>;
  meta: {
    role: string;
    experienceLevel: string;
    source: "builder" | "ats-improve";
  };
  createdAt: number;
}

function normalizeExperiences(input: unknown): GeneratedResume["enhancedExperiences"] {
  if (!Array.isArray(input)) return [];

  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const value = entry as Record<string, unknown>;

      return {
        jobTitle: String(value.jobTitle ?? value.job_title ?? ""),
        company: String(value.company ?? ""),
        duration: String(value.duration ?? ""),
        bulletPoints: Array.isArray(value.bulletPoints)
          ? value.bulletPoints.map((item) => String(item))
          : Array.isArray(value.bullet_points)
            ? value.bullet_points.map((item) => String(item))
            : [],
      };
    })
    .filter((entry): entry is GeneratedResume["enhancedExperiences"][number] => Boolean(entry));
}

function mapCloudResume(item: ResumeHistoryItem): ResumeHistoryRecord {
  return {
    id: item.id,
    source: "cloud",
    title: item.target_role ? `${item.target_role} Resume` : item.full_name || "Saved Resume",
    html: null,
    rawData: {
      professionalSummary: item.professional_summary ?? "",
      enhancedExperiences: normalizeExperiences(item.enhanced_experiences),
      coreSkills: item.core_skills ?? [],
      atsKeywords: item.ats_keywords ?? [],
      achievements: [],
      inferredCertifications: [],
      projects: [],
    },
    formData: {
      fullName: item.full_name ?? "",
      targetRole: item.target_role ?? "",
      experienceLevel: item.experience_level ?? "",
      industry: item.industry ?? "",
      skills: item.skills ?? "",
      tone: item.tone ?? "",
    },
    meta: {
      role: item.target_role ?? "",
      experienceLevel: item.experience_level ?? "",
      source: "builder",
    },
    createdAt: new Date(item.created_at).getTime(),
  };
}

function isLikelyDuplicateLocal(
  localEntry: ResumeHistoryRecord,
  cloudEntries: ResumeHistoryRecord[],
): boolean {
  return cloudEntries.some((cloudEntry) => {
    const sameTitle = cloudEntry.title.trim().toLowerCase() === localEntry.title.trim().toLowerCase();
    const sameRole = cloudEntry.meta.role.trim().toLowerCase() === localEntry.meta.role.trim().toLowerCase();
    const closeInTime = Math.abs(cloudEntry.createdAt - localEntry.createdAt) <= 5 * 60 * 1000;

    return sameTitle && sameRole && closeInTime;
  });
}

export async function getResumeHistory(): Promise<ResumeHistoryRecord[]> {
  const localEntries = (await getAllResumes()).map((entry) => ({
    ...entry,
    source: "local" as const,
  }));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return localEntries.sort((a, b) => b.createdAt - a.createdAt);
  }

  const { data, error } = await supabase
    .from("resume_builds")
    .select(
      "id, user_id, full_name, target_role, experience_level, industry, tone, skills, professional_summary, core_skills, enhanced_experiences, ats_keywords, pdf_uri, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data?.length) {
    return localEntries.sort((a, b) => b.createdAt - a.createdAt);
  }

  const cloudEntries = data.map((item) => mapCloudResume(item as ResumeHistoryItem));
  const merged = [
    ...cloudEntries,
    ...localEntries.filter((entry) => !isLikelyDuplicateLocal(entry, cloudEntries)),
  ];

  return merged.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteResumeHistoryRecord(
  entry: ResumeHistoryRecord,
): Promise<void> {
  if (entry.source === "cloud") {
    const { error } = await supabase.from("resume_builds").delete().eq("id", entry.id);
    if (error) throw error;
    return;
  }

  await deleteLocalResume(entry.id);
}
