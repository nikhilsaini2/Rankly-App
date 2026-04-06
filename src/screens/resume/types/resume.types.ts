export type ResumePhase = 'input' | 'loading' | 'preview' | 'exported'
export type InputTab = 'form' | 'history'
export type CurrencyType = 'USD' | 'INR' | 'EUR'

export interface WorkExperience {
  jobTitle: string
  company: string
  duration: string
  achievement1: string
  achievement2: string
}

export interface ResumeFormData {
  // Step 1 — Personal
  fullName: string
  email: string
  phone: string
  linkedin: string
  city: string
  // Step 2 — Role
  targetRole: string
  experienceLevel: string
  industry: string
  skills: string
  // Step 3 — Experience
  experiences: WorkExperience[]
  // Step 4 — Education
  degree: string
  institution: string
  graduationYear: string
  grade: string
  certifications: string
  languages: string
  // Step 5 — Tone
  tone: string
  topAchievement: string
  targetCompanies: string
  specialInstructions: string
}

export interface GeneratedResume {
  professionalSummary: string
  enhancedExperiences: EnhancedExperience[]
  coreSkills: string[]
  atsKeywords: string[]
}

export interface EnhancedExperience {
  jobTitle: string
  company: string
  duration: string
  bulletPoints: string[]
}

export interface ResumeHistoryItem {
  id: string
  user_id: string
  full_name: string
  target_role: string
  experience_level: string | null
  industry: string | null
  tone: string | null
  skills: string | null
  professional_summary: string | null
  core_skills: string[] | null
  enhanced_experiences: any | null
  ats_keywords: string[] | null
  pdf_uri: string | null
  created_at: string
}

export interface ResumeBuilderState {
  phase: ResumePhase
  currentStep: number
  inputTab: InputTab
  generatedResume: GeneratedResume | null
  pdfUri: string | null
  exporting: boolean
  error: string | null
  loadingMessage: number
  resumeHistory: ResumeHistoryItem[]
  historyLoading: boolean
  selectedResume: ResumeHistoryItem | null
}
