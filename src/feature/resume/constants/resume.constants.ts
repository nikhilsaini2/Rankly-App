import type { WorkExperience } from "../types/resume.types";

export const LOADING_MESSAGES: string[] = [
  "Analyzing your experience...",
  "Crafting your summary...",
  "Optimizing for ATS systems...",
  "Adding power words...",
  "Formatting for recruiters...",
];

export const STEP_TITLES: string[] = [
  "Let's start with you",
  "What role are you targeting?",
  "Your work experience",
  "Education & extras",
  "Final touches",
];

export const STEP_SUBTITLES: string[] = [
  "Your basic contact information",
  "This shapes your entire resume",
  "Add your most recent roles",
  "Complete your profile",
  "How should your resume sound?",
];

export const STEP_ICONS: string[] = [
  "person-outline",
  "briefcase-outline",
  "layers-outline",
  "school-outline",
  "sparkles-outline",
];

export const EXPERIENCE_LEVELS: string[] = [
  "Fresher",
  "1-2 yrs",
  "3-5 yrs",
  "6-10 yrs",
  "10+ yrs",
];

export const INDUSTRIES: string[] = [
  "Technology",
  "Finance",
  "Healthcare",
  "Marketing",
  "Design",
  "Sales",
  "Other",
];

export const TONES: string[] = [
  "Professional",
  "Confident",
  "Creative",
  "Academic",
];

export const CURRENCY_OPTIONS = ["USD", "INR", "EUR"] as const;

export const FIELD_ICONS: Record<string, string> = {
  fullName: "person-outline",
  email: "mail-outline",
  phone: "call-outline",
  linkedin: "logo-linkedin",
  city: "location-outline",
  targetRole: "briefcase-outline",
  skills: "code-slash-outline",
  company: "business-outline",
  duration: "calendar-outline",
  achievement: "checkmark-circle-outline",
  degree: "school-outline",
  institution: "library-outline",
  year: "calendar-outline",
  grade: "ribbon-outline",
  certifications: "medal-outline",
  languages: "language-outline",
  targetCompanies: "rocket-outline",
};

export const EMPTY_EXPERIENCE: WorkExperience = {
  jobTitle: "",
  company: "",
  duration: "",
  achievement1: "",
  achievement2: "",
};

export const MAX_EXPERIENCES = 4;
export const TOTAL_STEPS = 5;

// ─── Single source of truth for required fields ───────────────────────────────
// This drives BOTH the * indicator in the UI AND the validation logic.
// Any field listed here must also be validated in validateStep().
export const REQUIRED_FIELDS: Record<string, boolean> = {
  // Step 1
  fullName: true,
  email: true,
  // Step 2
  targetRole: true,
  experienceLevel: true,
  industry: true,
  skills: true,
  // Step 3 — experience fields required for first entry (non-Fresher)
  'exp.jobTitle': true,
  'exp.company': true,
  'exp.duration': true,
  // Step 4
  degree: true,
  institution: true,
  graduationYear: true,
  // Step 5
  tone: true,
};

export function isFieldRequired(field: string): boolean {
  return !!REQUIRED_FIELDS[field];
}
