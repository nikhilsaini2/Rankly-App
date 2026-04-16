import { useCallback, useMemo } from "react";
import type { Answer } from "../feature/interview";

interface AIChatIntegrationReturn {
  sendInterviewContext: () => void;
}

export function useAIChatIntegration(answers: Answer[]): AIChatIntegrationReturn {
  // Memoize the callback to prevent unnecessary re-renders
  const sendInterviewContext = useMemo(() => {
    return () => {
      if (answers.length === 0) return;
    };
  }, [answers.length]); // Only depend on length, not the entire array

  return {
    sendInterviewContext,
  };
}
