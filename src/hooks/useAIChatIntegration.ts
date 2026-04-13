import { useCallback } from "react";
import type { Answer } from "../feature/interview";

interface AIChatIntegrationReturn {
  sendInterviewContext: () => void;
}

export function useAIChatIntegration(answers: Answer[]): AIChatIntegrationReturn {
  const sendInterviewContext = useCallback(() => {
    if (answers.length === 0) return;
  }, [answers]);

  return {
    sendInterviewContext,
  };
}
