import { User } from "../../types/common.types";
import { supabase } from "../supabase/supabase";

export const getUserProfile = async (): Promise<User> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    avatarUrl: data.avatar_url,
    role: data.role,
    bio: data.bio,
    createdAt: data.created_at,
  };
};

export const logout = async () => {
  await supabase.auth.signOut();
};
