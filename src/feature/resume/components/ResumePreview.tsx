/**
 * ResumePreview — thin wrapper used by ResumeBuilderScreen.
 * All rendering is delegated to ResumeRenderer (single source of truth).
 */
import React from "react";
import type { GeneratedResume, ResumeFormData } from "../types/resume.types";
import { ResumeRenderer } from "./ResumeRenderer";

interface ResumePreviewProps {
  formData: ResumeFormData;
  generatedResume: GeneratedResume;
  isHistoryView: boolean;
  processing: boolean;
  onAction: () => void;
  onReset: () => void;
  onBackToHistory: () => void;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({
  formData,
  generatedResume,
  isHistoryView,
  processing,
  onAction,
  onReset,
  onBackToHistory,
}) => {
  if (isHistoryView) {
    return (
      <ResumeRenderer
        generatedResume={generatedResume}
        formData={formData}
        onAction={onAction}
        onBack={onBackToHistory}
        processing={processing}
        actionLabel="📄 Download & Share PDF"
        backLabel="Back to History"
      />
    );
  }

  return (
    <ResumeRenderer
      generatedResume={generatedResume}
      formData={formData}
      onAction={onAction}
      onReset={onReset}
      processing={processing}
      actionLabel="📄 Download & Share PDF"
      resetLabel="✏️ Start Over"
    />
  );
};
