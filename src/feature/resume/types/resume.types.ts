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

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ResumeEngineState {
  phase: ResumePhase
  currentStep: number
  inputTab: InputTab
  formData: ResumeFormData
  generatedResume: GeneratedResume | null
  pdfUri: string | null
  selectedResume: ResumeHistoryItem | null
  resumeHistory: ResumeHistoryItem[]
  
  asyncStatus: AsyncStatus
  loadingMessage: number
  error: { message: string; type?: 'network' | 'validation' | 'server'; retryAction?: string } | null
  lastSaved?: number
}

export type ResumeEngineAction =
  | { type: 'SET_TAB'; tab: InputTab }
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_FORM'; data: Partial<ResumeFormData> }
  | { type: 'UPDATE_EXPERIENCE'; index: number; field: keyof WorkExperience; value: string }
  | { type: 'ADD_EXPERIENCE'; experience: WorkExperience }
  | { type: 'REMOVE_EXPERIENCE'; index: number }
  
  | { type: 'START_ASYNC'; messageIndex?: number }
  | { type: 'ABORT_ASYNC' }
  | { type: 'SET_ERROR'; error: { message: string; type?: 'network' | 'validation' | 'server'; retryAction?: string } }
  | { type: 'SET_PHASE'; phase: ResumePhase }
  | { type: 'GENERATE_SUCCESS'; generatedResume: GeneratedResume }
  | { type: 'EXPORT_SUCCESS'; pdfUri: string }
  | { type: 'HISTORY_FETCH_SUCCESS'; history: ResumeHistoryItem[] }
  | { type: 'HISTORY_DELETE_SUCCESS'; id: string }
  | { type: 'LOAD_HISTORY_ITEM'; item: ResumeHistoryItem }
  
  | { type: 'RESTORE_SESSION'; state: Partial<ResumeEngineState> }
  | { type: 'RESET_BUILDER' }
  | { type: 'RESET_ALL' }
