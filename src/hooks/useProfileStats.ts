import { useCallback, useEffect, useRef, useState } from "react";
import { getProfileStatsForUser } from "../services/profile/profileService";

interface ProfileStats {
  resumes: number;
  bestAts: number;
  interviews: number;
}

const DEFAULT_STATS: ProfileStats = { resumes: 0, bestAts: 0, interviews: 0 };

function hasStatsChanged(prev: ProfileStats, next: ProfileStats): boolean {
  return (
    prev.resumes !== next.resumes ||
    prev.bestAts !== next.bestAts ||
    prev.interviews !== next.interviews
  );
}

export function useProfileStats(userId: string | undefined) {
  const [stats, setStats] = useState<ProfileStats>(DEFAULT_STATS);
  const statsRef = useRef<ProfileStats>(DEFAULT_STATS);
  const isFirstLoad = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      if (!userId) return;

      try {
        const next = await getProfileStatsForUser(userId);

        if (isFirstLoad.current || hasStatsChanged(statsRef.current, next)) {
          statsRef.current = next;
          setStats(next);
          isFirstLoad.current = false;
        }
      } catch {}
    },
    [userId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  return { stats, refetch };
}
