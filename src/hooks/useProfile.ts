import { useEffect, useState } from 'react';
import { getUserProfile } from '../services/profile/profileService';
import type { User } from '../types/common.types';

export const useProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProfile() {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProfile();
      setUser(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  return { user, loading, error, refetch: fetchProfile };
};
