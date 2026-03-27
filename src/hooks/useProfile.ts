import { useCallback, useEffect, useState } from "react";
import { getUserProfile } from "../services/profile/profileService";
import { User } from "../types/common.types";

export const useProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserProfile();
      setUser(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { user, loading };
};
