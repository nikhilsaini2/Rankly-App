import { useCallback, useState } from 'react';
import {
  deleteInterview,
  getAllInterviews,
  type InterviewReport,
} from '../services/interviewStorage';

export interface UseInterviewHistoryReturn {
  history: InterviewReport[];
  loading: boolean;
  fetchHistory: () => Promise<void>;
  removeInterview: (id: string) => Promise<void>;
}

export function useInterviewHistory(): UseInterviewHistoryReturn {
  const [history, setHistory] = useState<InterviewReport[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllInterviews();
      setHistory(all);
    } catch (err) {
      console.warn('[useInterviewHistory] Failed to load history', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeInterview = useCallback(async (id: string) => {
    // Optimistic update
    setHistory(prev => prev.filter(r => r.id !== id));
    try {
      await deleteInterview(id);
    } catch (err) {
      console.warn('[useInterviewHistory] Failed to delete', err);
      // Re-fetch to restore correct state on failure
      const all = await getAllInterviews();
      setHistory(all);
    }
  }, []);

  return { history, loading, fetchHistory, removeInterview };
}
