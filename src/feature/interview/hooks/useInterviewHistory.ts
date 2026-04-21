import { useCallback, useState } from "react";
import {
  deleteInterviewHistoryEntry,
  getInterviewHistory,
} from "../../../services/interview/interviewHistoryService";
import type { InterviewHistoryEntry } from "../types/interview.types";

export interface UseInterviewHistoryReturn {
  history: InterviewHistoryEntry[];
  loading: boolean;
  fetchHistory: () => Promise<void>;
  removeInterview: (entry: InterviewHistoryEntry) => Promise<void>;
}

export function useInterviewHistory(): UseInterviewHistoryReturn {
  const [history, setHistory] = useState<InterviewHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getInterviewHistory();
      setHistory(all);
    } catch (err) {
      console.warn("[useInterviewHistory] Failed to load history", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeInterview = useCallback(async (entry: InterviewHistoryEntry) => {
    // Optimistic update
    setHistory((prev) => prev.filter((report) => report.id !== entry.id));
    try {
      await deleteInterviewHistoryEntry(entry);
    } catch (err) {
      console.warn("[useInterviewHistory] Failed to delete", err);
      // Re-fetch to restore correct state on failure
      const all = await getInterviewHistory();
      setHistory(all);
    }
  }, []);

  return { history, loading, fetchHistory, removeInterview };
}
