import { useCallback, useState } from 'react';
import {
  deleteResume,
  getAllResumes,
  type ResumeHistoryEntry,
} from '../../../services/resume/resumeHistoryStorage';

export interface UseResumeHistoryReturn {
  history: ResumeHistoryEntry[];
  loading: boolean;
  fetchHistory: () => Promise<void>;
  removeResume: (id: string) => Promise<void>;
}

export function useResumeHistory(): UseResumeHistoryReturn {
  const [history, setHistory] = useState<ResumeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllResumes();
      setHistory(all);
    } catch (err) {
      console.warn('[useResumeHistory] Failed to load history', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeResume = useCallback(async (id: string) => {
    // Optimistic update
    setHistory(prev => prev.filter(e => e.id !== id));
    try {
      await deleteResume(id);
    } catch (err) {
      console.warn('[useResumeHistory] Failed to delete', err);
      // Re-fetch to restore correct state on failure
      const all = await getAllResumes();
      setHistory(all);
    }
  }, []);

  return { history, loading, fetchHistory, removeResume };
}
