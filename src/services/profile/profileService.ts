import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

import type { ExperienceLevel, User } from "../../types/common.types";
import { supabase } from "../supabase/supabase";

function mapUserRow(data: Record<string, unknown>, authUserId: string): User {
  return {
    id: authUserId,
    firstName: (data.first_name as string) ?? "",
    lastName: (data.last_name as string) ?? "",
    email: (data.email as string) ?? "",
    avatarUrl: (data.avatar_url as string | undefined) ?? undefined,
    role: (data.target_role as string) ?? "SWE",
    bio: (data.bio as string | undefined) ?? undefined,
    experienceLevel: (data.experience_level as ExperienceLevel | null) ?? null,
    industry: (data.industry as string | null) ?? null,
    linkedinUrl: (data.linkedin_url as string | null) ?? null,
    plan: (data.plan as "free" | "pro") ?? "free",
    credits: typeof data.credits === "number" ? data.credits : 5,
    onboardingDone: Boolean(data.onboarding_done),
    createdAt: (data.created_at as string) ?? new Date().toISOString(),
  };
}

export const getUserProfile = async (): Promise<User | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  if (!data) return null;

  return mapUserRow(data as Record<string, unknown>, user.id);
};

export type UserProfileUpdate = {
  firstName?: string;
  lastName?: string;
  bio?: string;
  role?: string;
  experienceLevel?: ExperienceLevel | null;
  industry?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
};

export const updateUserProfile = async (
  fields: UserProfileUpdate,
): Promise<User> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const payload: Record<string, unknown> = {};
  if (fields.firstName !== undefined) payload.first_name = fields.firstName;
  if (fields.lastName !== undefined) payload.last_name = fields.lastName;
  if (fields.bio !== undefined) payload.bio = fields.bio;
  if (fields.role !== undefined) payload.target_role = fields.role;
  if (fields.experienceLevel !== undefined)
    payload.experience_level = fields.experienceLevel;
  if (fields.industry !== undefined) payload.industry = fields.industry;
  if (fields.linkedinUrl !== undefined)
    payload.linkedin_url = fields.linkedinUrl;
  if (fields.avatarUrl !== undefined) payload.avatar_url = fields.avatarUrl;

  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("auth_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return mapUserRow(data as Record<string, unknown>, user.id);
};

export const logout = async () => {
  await supabase.auth.signOut();
};

export const deleteUserAccountData = async (): Promise<void> => {
  // getUser() validates the token server-side and triggers a refresh if needed
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("AUTH_SESSION_MISSING");
  }

  // getSession() now returns a fresh token after getUser() has validated/refreshed it
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("AUTH_SESSION_MISSING");
  }

  const response = await fetch(
    "https://zsamkcmvshjgtzljqvok.supabase.co/functions/v1/delete-user-account",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ userId: user.id }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "DELETE_FAILED");
  }

  // Clear all local AsyncStorage data for this user so it never bleeds
  // into a new account created with the same credentials on this device.
  const { clearUserLocalData } = await import("../local/localStorageService");
  await clearUserLocalData(user.id);

  await supabase.auth.signOut();
};

export type ProfileStats = {
  resumes: number;
  bestAts: number;
  interviews: number;
};

export async function getProfileStatsForUser(
  authUserId: string,
): Promise<ProfileStats> {
  const results = await Promise.allSettled([
    supabase
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authUserId),
    supabase
      .from("ats_scores")
      .select("overall_score")
      .eq("user_id", authUserId),
    supabase
      .from("interview_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authUserId)
      .eq("completed", true),
  ]);

  let resumes = 0;
  let bestAts = 0;
  let interviews = 0;

  const r0 = results[0];
  if (r0.status === "fulfilled" && !r0.value.error && r0.value.count != null) {
    resumes = r0.value.count;
  }

  const r1 = results[1];
  if (r1.status === "fulfilled" && !r1.value.error && r1.value.data) {
    const nums = r1.value.data.map((row) => row.overall_score as number);
    bestAts = nums.length ? Math.max(...nums) : 0;
  }

  const r2 = results[2];
  if (r2.status === "fulfilled" && !r2.value.error && r2.value.count != null) {
    interviews = r2.value.count;
  }

  return { resumes, bestAts, interviews };
}

export async function uploadAvatarFromUri(
  authUserId: string,
  uri: string,
  mimeType?: string,
): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    const buffer = decode(base64);
    const uint8Array = new Uint8Array(buffer);

    const fileExtension = mimeType?.includes("png") ? "png" : "jpg";
    const timestamp = Date.now();
    const path = `${authUserId}/avatar_${timestamp}.${fileExtension}`;

    // Delete old avatar files before uploading new one
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(authUserId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${authUserId}/${f.name}`);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, uint8Array, {
        upsert: true,
        contentType: mimeType || "image/jpeg",
      });

    if (upErr) {
      throw new Error("Avatar storage upload failed");
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl?.startsWith("http")) {
      throw new Error("Could not get avatar URL");
    }

    // Append timestamp as cache buster so Image component re-fetches
    return `${publicUrl}?t=${timestamp}`;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Unable to read the file")) {
        throw new Error("Failed to read image file");
      }
      if (error.message.includes("Avatar storage upload failed")) {
        throw new Error("Storage upload failed - check bucket permissions");
      }
      if (error.message.includes("Could not get avatar URL")) {
        throw new Error("Failed to get public URL");
      }
    }
    throw error;
  }
}
