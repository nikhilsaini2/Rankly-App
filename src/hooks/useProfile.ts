import { useCallback, useEffect, useRef, useState } from "react";
import { getUserProfile } from "../services/profile/profileService";
import type { User } from "../types/common.types";

function hasUserChanged(prev: User, next: User): boolean {
  return (
    prev.firstName !== next.firstName ||
    prev.lastName !== next.lastName ||
    prev.avatarUrl !== next.avatarUrl ||
    prev.credits !== next.credits ||
    prev.bio !== next.bio ||
    prev.role !== next.role ||
    prev.plan !== next.plan
  );
}

export const useProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRef = useRef<User | null>(null);
  const isFirstLoad = useRef(true);

  const fetchProfile = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await getUserProfile();

      if (data === null) {
        setUser(null);
        userRef.current = null;
        return;
      }

      if (
        isFirstLoad.current ||
        userRef.current === null ||
        hasUserChanged(userRef.current, data)
      ) {
        userRef.current = data;
        setUser(data);
        isFirstLoad.current = false;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile(false);
  }, [fetchProfile]);

  const refetch = useCallback(() => {
    fetchProfile(true);
  }, [fetchProfile]);

  return { user, loading, error, refetch };
};
