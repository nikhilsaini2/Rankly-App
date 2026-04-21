import { useCallback, useState } from "react";
import {
  deleteResumeHistoryRecord,
  getResumeHistory,
  type ResumeHistoryRecord,
} from "../../../services/resume/resumeHistoryService";

export interface UseResumeHistoryReturn {
  history: ResumeHistoryRecord[];
  loading: boolean;
  fetchHistory: () => Promise<void>;
  removeResume: (entry: ResumeHistoryRecord) => Promise<void>;
}

export function useResumeHistory(): UseResumeHistoryReturn {
  const [history, setHistory] = useState<ResumeHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getResumeHistory();
      setHistory(all);
    } catch (err) {
      console.warn("[useResumeHistory] Failed to load history", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeResume = useCallback(async (entry: ResumeHistoryRecord) => {
    // Optimistic update
    setHistory((prev) => prev.filter((record) => record.id !== entry.id));
    try {
      await deleteResumeHistoryRecord(entry);
    } catch (err) {
      console.warn("[useResumeHistory] Failed to delete", err);
      // Re-fetch to restore correct state on failure
      const all = await getResumeHistory();
      setHistory(all);
    }
  }, []);

  return { history, loading, fetchHistory, removeResume };
}
