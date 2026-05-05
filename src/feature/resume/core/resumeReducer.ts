import {
  EMPTY_EXPERIENCE,
  EXPERIENCE_LEVELS,
  INDUSTRIES,
  TONES,
} from "../constants/resume.constants";
import type {
  ResumeEngineAction,
  ResumeEngineState,
  ResumePhase,
} from "../types/resume.types";

export const INITIAL_FORM_DATA = {
  fullName: "",
  email: "",
  phone: "",
  linkedin: "",
  city: "",
  targetRole: "",
  experienceLevel: EXPERIENCE_LEVELS[0],
  industry: INDUSTRIES[0],
  skills: "",
  experiences: [{ ...EMPTY_EXPERIENCE }],
  degree: "",
  institution: "",
  graduationYear: "",
  grade: "",
  certifications: "",
  languages: "",
  tone: TONES[0],
  topAchievement: "",
  targetCompanies: "",
  specialInstructions: "",
};

export const INITIAL_RESUME_STATE: ResumeEngineState = {
  phase: "input",
  currentStep: 1,
  inputTab: "form",
  formData: { ...INITIAL_FORM_DATA },
  generatedResume: null,
  pdfUri: null,
  selectedResume: null,
  resumeHistory: [],

  asyncStatus: "idle",
  loadingMessage: 0,
  error: null,
  lastSaved: Date.now(),
};

const VALID_TRANSITIONS: Record<ResumePhase, ResumePhase[]> = {
  input: ["loading", "preview", "input"],
  loading: ["preview", "input", "loading"],
  preview: ["exported", "input", "preview", "loading"],
  exported: ["input", "exported", "preview"],
};

export function resumeEngineReducer(
  state: ResumeEngineState,
  action: ResumeEngineAction,
): ResumeEngineState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, inputTab: action.tab, error: null };

    case "SET_STEP":
      return { ...state, currentStep: action.step };

    case "UPDATE_FORM":
      return {
        ...state,
        formData: { ...state.formData, ...action.data },
      };

    case "UPDATE_EXPERIENCE": {
      const newExperiences = [...state.formData.experiences];
      if (newExperiences[action.index]) {
        newExperiences[action.index] = {
          ...newExperiences[action.index],
          [action.field]: action.value,
        };
      }
      return {
        ...state,
        formData: { ...state.formData, experiences: newExperiences },
      };
    }

    case "ADD_EXPERIENCE":
      return {
        ...state,
        formData: {
          ...state.formData,
          experiences: [...state.formData.experiences, action.experience],
        },
      };

    case "REMOVE_EXPERIENCE":
      return {
        ...state,
        formData: {
          ...state.formData,
          experiences: state.formData.experiences.filter(
            (_, i) => i !== action.index,
          ),
        },
      };

    case "START_ASYNC":
      return {
        ...state,
        asyncStatus: "loading",
        error: null,
        loadingMessage: action.messageIndex ?? 0,
      };

    case "ABORT_ASYNC":
      return {
        ...state,
        asyncStatus: "idle",
        error: { message: "Action cancelled", type: "network" },
      };

    case "SET_ERROR":
      return { ...state, asyncStatus: "error", error: action.error };

    case "SET_PHASE":
      if (!VALID_TRANSITIONS[state.phase]?.includes(action.phase)) {
        return state;
      }
      return { ...state, phase: action.phase };

    case "GENERATE_SUCCESS":
      return {
        ...state,
        asyncStatus: "success",
        phase: "preview",
        generatedResume: action.generatedResume,
        error: null,
      };

    case "EXPORT_SUCCESS":
      return {
        ...state,
        asyncStatus: "idle",
        phase: "preview",
        pdfUri: action.pdfUri,
        error: null,
      };

    case "HISTORY_FETCH_SUCCESS":
      return {
        ...state,
        asyncStatus: "idle",  // We do not use "success" here so it doesn't block UI with generic loading checks
        resumeHistory: action.history,
      };

    case "HISTORY_DELETE_SUCCESS":
      return {
        ...state,
        resumeHistory: state.resumeHistory.filter((r) => r.id !== action.id),
      };

    case "LOAD_HISTORY_ITEM":
      return {
        ...state,
        selectedResume: action.item,
        generatedResume: {
          professionalSummary: action.item.professional_summary ?? "",
          enhancedExperiences: action.item.enhanced_experiences ?? [],
          coreSkills: action.item.core_skills ?? [],
          atsKeywords: action.item.ats_keywords ?? [],
        },
        formData: {
          ...state.formData,
          fullName: action.item.full_name,
          targetRole: action.item.target_role,
        },
        phase: "preview",
        error: null,
      };

    case "RESTORE_SESSION": {
      const restored = action.state as Partial<ResumeEngineState> & { formData?: any };
      const restoredFormData = restored.formData ?? {};
      return {
        ...state,
        phase: "input",
        currentStep: typeof restored.currentStep === "number" ? restored.currentStep : 1,
        inputTab: restored.inputTab ?? "form",
        formData: {
          ...INITIAL_FORM_DATA,
          ...restoredFormData,
          experiences:
            Array.isArray(restoredFormData.experiences) && restoredFormData.experiences.length > 0
              ? restoredFormData.experiences
              : [{ ...EMPTY_EXPERIENCE }],
        },
        asyncStatus: "idle",
        error: null,
        generatedResume: null,
        selectedResume: null,
      };
    }

    case "RESET_BUILDER":
      return {
        ...state,
        phase: "input",
        currentStep: 1,
        inputTab: "form",
        formData: { ...INITIAL_FORM_DATA },
        generatedResume: null,
        pdfUri: null,
        selectedResume: null,
        asyncStatus: "idle",
        error: null,
      };

    case "RESET_ALL":
      return { ...INITIAL_RESUME_STATE, resumeHistory: state.resumeHistory };

    default:
      return state;
  }
}
