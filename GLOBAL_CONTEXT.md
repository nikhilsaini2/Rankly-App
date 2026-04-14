# RANKLY APP - GLOBAL CONTEXT DOCUMENTATION

**Generated:** April 2026  
**Purpose:** Comprehensive reference for all core systems, architecture, and implementation details

---

## TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [Navigation System](#navigation-system)
3. [Resume Builder System](#resume-builder-system)
4. [AI Integration](#ai-integration)
5. [Type System](#type-system)
6. [Services & Utilities](#services--utilities)
7. [Key Hooks](#key-hooks)
8. [Screen Components](#screen-components)
9. [Data Flow](#data-flow)
10. [Error Handling](#error-handling)

---

## ARCHITECTURE OVERVIEW

### App Structure

Rankly is a React Native Expo app with the following core layers:

```
Rankly/
├── src/
│   ├── navigation/          # Navigation configuration
│   ├── screens/             # Screen components
│   ├── feature/             # Feature modules (resume, interview, etc.)
│   ├── services/            # External service integrations
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── components/          # Reusable UI components
│   ├── theme/               # Design tokens and styling
│   └── constants/           # App constants
├── App.tsx                  # Root component
└── package.json             # Dependencies
```

### Technology Stack

- **Framework:** React Native with Expo
- **Navigation:** React Navigation (native stack + bottom tabs)
- **State Management:** React Hooks + useReducer
- **AI:** Google Gemini API (gemini-2.5-flash)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Animations:** React Native Reanimated
- **UI:** Expo Linear Gradient, Ionicons
- **Storage:** AsyncStorage (local), Supabase Storage (cloud)

---

## NAVIGATION SYSTEM

### Navigation Structure

```
AppNavigator (Root Stack)
├── Tabs (Bottom Tab Navigator)
│   ├── Home
│   ├── Resume
│   ├── AI
│   └── Profile
├── AtsScore (Modal)
├── SalaryNegotiation (Modal)
├── ResumeBuilder (Modal)
├── PdfViewer (Modal)
└── ImprovedResumePreview (Modal)
```

### Key Files

- **AppNavigator.tsx** - Root stack configuration with modal presentations
- **BottomTabs.tsx** - Tab navigator setup
- **TabBar.tsx** - Custom tab bar with gradient active states
- **navigation.types.ts** - Navigation type definitions

### Navigation Patterns

#### Modal Presentations

```typescript
// iOS: fullScreenModal, Android: card (prevents tab bar flicker)
presentation: Platform.OS === "ios" ? "fullScreenModal" : "card"
animation: "slide_from_bottom"
```

#### Tab Navigation

```typescript
// Custom TabBar with gradient active states
// Ionicons for tab icons
// Smooth transitions between tabs
```

---

## RESUME BUILDER SYSTEM

### Overview

The Resume Builder is a multi-step form that generates AI-optimized resumes with ATS scoring.

### Architecture

```
useResumeEngine (Main Hook)
├── State: resumeEngineReducer
├── Draft Persistence: AsyncStorage
├── AI Generation: buildResumePrompt → Gemini
├── PDF Export: expo-print
└── History: Supabase resume_builds table
```

### Core Components

#### 1. useResumeEngine Hook

**Location:** `src/feature/resume/hooks/useResumeEngine.ts`

**Responsibilities:**
- Manage resume builder state via reducer
- Handle draft persistence (auto-save every 500ms)
- Coordinate AI generation pipeline
- Export PDF and share functionality
- Resume history management

**Key Methods:**
```typescript
handleNext()           // Validate step and advance
handleBack()           // Go back or exit
buildResume()          // Generate AI resume
exportPDF()            // Create PDF file
shareResume()          // Share via native share
peekDraft()            // Check if draft exists (no state change)
applyDraft()           // Load draft into state
clearDraft()           // Delete draft
fetchResumeHistory()   // Load user's resume history
```

**Draft Persistence:**
- Stored in AsyncStorage with version tracking
- Auto-saves every 500ms when form changes
- Validates structural integrity before restore
- Checks for meaningful content (prevents empty draft restore)

#### 2. resumeEngineReducer

**Location:** `src/feature/resume/core/resumeReducer.ts`

**State Shape:**
```typescript
interface ResumeEngineState {
  phase: 'input' | 'loading' | 'preview' | 'exported'
  currentStep: 1-5
  inputTab: 'form' | 'history'
  formData: ResumeFormData
  generatedResume: GeneratedResume | null
  pdfUri: string | null
  selectedResume: ResumeHistoryItem | null
  resumeHistory: ResumeHistoryItem[]
  asyncStatus: 'idle' | 'loading' | 'success' | 'error'
  loadingMessage: number (index into LOADING_MESSAGES)
  error: { message, type, retryAction } | null
  lastSaved: number (timestamp)
}
```

**Phase Transitions:**
```
input → loading → preview → exported
input ← preview ← loading
```

**Actions:**
- `SET_TAB` - Switch between form/history
- `SET_STEP` - Navigate to step 1-5
- `UPDATE_FORM` - Update form fields
- `UPDATE_EXPERIENCE` - Update work experience entry
- `ADD_EXPERIENCE` / `REMOVE_EXPERIENCE` - Manage experiences
- `START_ASYNC` / `ABORT_ASYNC` - Async operation lifecycle
- `SET_ERROR` - Set error state
- `SET_PHASE` - Change phase (with validation)
- `GENERATE_SUCCESS` - Resume generated
- `EXPORT_SUCCESS` - PDF exported
- `HISTORY_FETCH_SUCCESS` - Resume history loaded
- `HISTORY_DELETE_SUCCESS` - Resume deleted
- `LOAD_HISTORY_ITEM` - Load previous resume
- `RESTORE_SESSION` - Restore from draft
- `RESET_BUILDER` / `RESET_ALL` - Clear state

#### 3. Form Validation

**Location:** `src/feature/resume/utils/validation.ts`

**Validation Strategy:**
- Per-step validation (returns field errors)
- Full-form validation (returns flat error list)
- Yup schema for Gemini response validation

**Step Requirements:**
```
Step 1: fullName, email (+ optional linkedin)
Step 2: targetRole, experienceLevel, industry, skills
Step 3: First experience (jobTitle, company, duration) - skip for Fresher
Step 4: degree, institution, graduationYear
Step 5: tone
```

#### 4. AI Resume Generation

**Location:** `src/feature/resume/utils/resumePrompt.ts`

**Prompt Strategy:**
- Experience-level specific directives (Fresher → Lead)
- Elite verb enforcement (Architected, Engineered, Optimized, etc.)
- Metric-driven bullet points (max 20 words each)
- ATS keyword injection
- Sanitization of weak language

**Output Format:**
```json
{
  "professionalSummary": "3 sentences, 60 words max",
  "enhancedExperiences": [
    {
      "jobTitle": "string",
      "company": "string",
      "duration": "string",
      "bulletPoints": ["4 bullets max, 20 words each"]
    }
  ],
  "coreSkills": ["10-12 flat strings"],
  "atsKeywords": ["8 keywords"]
}
```

#### 5. Resume Sanitization

**Location:** `src/feature/resume/utils/resumeSanitizer.ts`

**Sanitization Rules:**
- Cap bullets at 4 per role
- Truncate overflowing bullets
- Remove weak/placeholder bullets
- Deduplicate and cap skills (12 max)
- Deduplicate and cap keywords (8 max)
- Enforce consistency (keywords must appear in content)
- Strip placeholder text

#### 6. HTML Generation

**Location:** `src/feature/resume/utils/resumeHTML.ts`

**Output:**
- Professional PDF-ready HTML
- Gradient header with role
- Organized sections (summary, experience, education, skills)
- ATS keyword footer
- Print-optimized styling

### Resume Screens

#### ResumeScreen

**Location:** `src/feature/resume/screens/ResumeScreen.tsx`

**Features:**
- Upload PDF resumes
- View resume history
- Trigger ATS analysis
- Delete resumes
- Empty state with feature highlights

**Flow:**
1. User uploads PDF
2. File stored in Supabase Storage
3. Resume record created (status: 'uploaded')
4. User can analyze immediately or later

#### ATSScoreScreen

**Location:** `src/feature/resume/screens/ATSScoreScreen.tsx`

**Displays:**
- Overall ATS score (0-100)
- Breakdown scores (keyword, format, content, readability)
- Found/missing keywords
- Strengths and improvements
- AI summary

**CTA:** "Improve with AI" button → ImprovedResumePreviewScreen

#### ImprovedResumePreviewScreen

**Location:** `src/feature/resume/screens/ImprovedResumePreviewScreen.tsx`

**Process:**
1. Fetch ATS report
2. Fetch resume text from Supabase
3. Call `generateImprovedResume()` service
4. Display optimized resume preview
5. Export PDF or share

**Features:**
- Real-time optimization animation
- Contact info extraction
- Experience enhancement
- Skill/keyword optimization
- PDF export and sharing

### Resume Types

**Location:** `src/feature/resume/types/resume.types.ts`

```typescript
interface ResumeFormData {
  // Step 1
  fullName, email, phone, linkedin, city
  // Step 2
  targetRole, experienceLevel, industry, skills
  // Step 3
  experiences: WorkExperience[]
  // Step 4
  degree, institution, graduationYear, grade, certifications, languages
  // Step 5
  tone, topAchievement, targetCompanies, specialInstructions
}

interface GeneratedResume {
  professionalSummary: string
  enhancedExperiences: EnhancedExperience[]
  coreSkills: string[]
  atsKeywords: string[]
}

interface ResumeHistoryItem {
  id, user_id, full_name, target_role, experience_level, industry, tone
  skills, professional_summary, core_skills, enhanced_experiences
  ats_keywords, pdf_uri, created_at
}
```

### Resume Constants

**Location:** `src/feature/resume/constants/resume.constants.ts`

```typescript
LOADING_MESSAGES: string[]           // 5 rotating messages
STEP_TITLES: string[]                // Step headers
STEP_SUBTITLES: string[]             // Step descriptions
STEP_ICONS: string[]                 // Ionicons names
EXPERIENCE_LEVELS: string[]          // Fresher, 1-2 yrs, etc.
INDUSTRIES: string[]                 // Tech, Finance, etc.
TONES: string[]                      // Professional, Confident, etc.
REQUIRED_FIELDS: Record<string, boolean>  // Single source of truth
```

---

## AI INTEGRATION

### Gemini Service

**Location:** `src/services/gemini/gemini.ts`

#### Configuration

```typescript
const PRIMARY_MODEL = "gemini-2.5-flash-lite"  // 1000 RPD, 15 RPM free tier
const MIN_REQUEST_GAP_MS = 6500                // 10 RPM compliance
```

#### Core Functions

**generateGeminiText(prompt, modelName)**
- Single API call with caching
- In-flight deduplication
- Response cache (5 min TTL)
- djb2 hash for collision-free keys

**generateGeminiTextWithRetry(prompt, maxRetries, baseDelayMs)**
- Retry logic for transient failures
- Exponential backoff
- Never retries 429 (quota errors)
- Retries 503, 500, network errors

**generateGeminiWithContext(params)**
- Multi-turn conversation support
- History sanitization (must start with user, end with model)
- Prevents duplicate same-role entries
- Structured output validation

#### Error Handling

```typescript
class GeminiError extends Error {
  code: 'invalid_key' | 'invalid_request' | 'rate_limit' | 
        'unavailable' | 'server_error' | 'empty_response' | 'unknown'
}

// Error classification
isGeminiQuotaError(error)      // 429, quota, resource_exhausted
getGeminiErrorMessage(error)   // User-friendly messages
trackQuotaError(error)         // Logging for monitoring
```

#### Rate Limiting

```typescript
// Global rate limiter
const MIN_REQUEST_GAP_MS = 6500  // 10 RPM free tier
const requestQueue: Array<() => void> = []

// In-flight deduplication
const inFlightRequests = new Map<string, Promise<string>>()

// Response cache
const responseCache = new Map<string, { result, timestamp }>()
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes
```

### Prompts

**Location:** `src/services/gemini/prompts.ts`

#### buildAtsScorePrompt

```typescript
// Analyzes resume for ATS compatibility
// Returns: { overall_score, keyword_score, format_score, content_score, 
//            readability_score, keywords_found, keywords_missing, 
//            ai_summary, feedback }
```

#### buildInterviewQuestionsPrompt

```typescript
// Generates interview questions by role/difficulty/type
// Returns: ["q1", "q2", ...]
```

#### buildInterviewEvalPrompt

```typescript
// Evaluates interview answer
// Returns: { score: 0-10, feedback: string }
```

#### buildCareerCoachSystemPrompt

```typescript
// System prompt for AI career coach
// Handles greetings, domain filtering, warm tone
// Only assists with: resume, interviews, jobs, skills, career strategy, salary
```

### AI Features

#### 1. ATS Scoring

**Hook:** `useAtsScore()`
**Process:**
1. Upload resume PDF
2. Extract text via Gemini (if not already extracted)
3. Score resume against job description
4. Save score to Supabase
5. Display results

**Key Methods:**
```typescript
scoreResume(resumeId, jobDescription?)  // Main scoring function
getLatestScore(resumeId)                // Fetch most recent score
getScoreById(scoreId)                   // Fetch specific score
getScoreHistory(userId)                 // Fetch all scores
```

#### 2. Resume Improvement

**Service:** `generateImprovedResume(input)`
**Process:**
1. Fetch ATS report
2. Fetch resume text
3. Call Gemini with ATS findings
4. Extract contact, education, experience
5. Return optimized resume

**Input:**
```typescript
{
  resumeText: string
  atsReport: AtsScoreRow
  meta?: { title?, fileName? }
}
```

**Output:**
```typescript
{
  generatedResume: GeneratedResume
  contact: { fullName, email, phone, city, linkedin, targetRole }
  education: { degree, institution, graduationYear, grade }
}
```

#### 3. AI Chat

**Hook:** `useAIChat(profile)`
**Features:**
- Conversational career coaching
- Greeting detection (local response)
- Domain filtering (career-only)
- Message persistence to Supabase
- Warm, encouraging tone

**Key Methods:**
```typescript
send(userText)      // Send message and get response
clearChat()         // Delete all chat history
```

---

## TYPE SYSTEM

### Navigation Types

**Location:** `src/types/navigation.types.ts`

```typescript
type AuthStackParamList = {
  Onboarding: undefined
  Login: undefined
  Register: undefined
}

type RootStackParamList = {
  Tabs: undefined
  AtsScore: { resumeId: string; scoreId?: string }
  VoiceInterview: { role, difficulty, sessionType, questionCount }
  SalaryNegotiation: undefined
  ResumeBuilder: undefined
  PdfViewer: { url: string; fileName: string }
  ImprovedResumePreview: { resumeId: string; scoreId: string }
}

type RootTabParamList = {
  Home: undefined
  Resume: undefined
  AI: { atsContext?: string; initialSegment?: 'chat' | 'interview' } | undefined
  Profile: undefined
}
```

### Common Types

**Location:** `src/types/common.types.ts`

```typescript
interface User {
  id, firstName, lastName, email, avatarUrl
  role, bio, experienceLevel, industry, linkedinUrl
  plan: 'free' | 'pro'
  credits, onboardingDone, createdAt
}

interface AtsScoreRow {
  id, userId, resumeId
  overallScore, keywordScore, formatScore, contentScore, readabilityScore
  feedback: { strengths?, improvements? }
  keywordsFound, keywordsMissing, aiSummary, createdAt
}

interface ResumeRow {
  id, userId, title, fileUrl, fileName
  rawText, extractedText
  status: 'uploaded' | 'analyzed'
  latestScore, latestScoreId, isPrimary, createdAt
  ats_scores: AtsScoreSummary[]
}

interface ChatMessage {
  id, role: 'user' | 'assistant', content, createdAt?
}
```

---

## SERVICES & UTILITIES

### Resume Service

**Location:** `src/services/resume/improveResumeService.ts`

```typescript
generateImprovedResume(input: ImproveResumeInput): Promise<ImprovedResumeResult>
```

Orchestrates the ATS improvement pipeline:
1. Builds optimization prompt with ATS findings
2. Calls Gemini for enhanced resume
3. Extracts contact/education info
4. Sanitizes and validates output
5. Returns structured result

### Resume Upload Hook

**Location:** `src/hooks/useResumeUpload.ts`

```typescript
useResumeUpload() → {
  uploading: boolean
  progress: number (0-1)
  error: string | null
  pickResume()                    // Open file picker
  uploadResume(file)              // Upload to Supabase Storage
  deleteResume(id, storagePath)   // Delete from Storage + DB
}
```

**Upload Process:**
1. Pick PDF via DocumentPicker
2. Read as base64
3. Upload to Supabase Storage
4. Create resume record (status: 'uploaded')
5. Return resume row

### ATS Score Hook

**Location:** `src/hooks/useAtsScore.ts`

```typescript
useAtsScore() → {
  scoring: boolean
  score: AtsScoreRow | null
  error: string | null
  scoreResume(resumeId, jobDescription?)
  getLatestScore(resumeId)
  getScoreById(scoreId)
  getScoreHistory(userId)
}
```

**Scoring Process:**
1. Fetch resume record
2. Extract text if needed (via Gemini)
3. Build ATS prompt
4. Call Gemini for scoring
5. Save to Supabase
6. Cache score on resume row
7. Return mapped result

### AI Chat Hook

**Location:** `src/hooks/useAIChat.ts`

```typescript
useAIChat(profile: User | null) → {
  messages: ChatMessage[]
  loading: boolean
  ready: boolean
  send(userText: string)
  clearChat()
}
```

**Chat Flow:**
1. Load chat history from Supabase
2. Detect greetings (local response)
3. Build system prompt with user profile
4. Call Gemini with context
5. Save both messages to DB
6. Update UI with real DB IDs

---

## KEY HOOKS

### useResumeEngine

**State Management:**
- Multi-step form with validation
- Draft persistence
- AI generation pipeline
- PDF export
- Resume history

**Key Features:**
- Debounced auto-save (500ms)
- Network-aware error handling
- Resilience wrapper for retries
- Abort signal support

### useAtsScore

**Resume Analysis:**
- PDF text extraction
- ATS scoring
- Keyword analysis
- Improvement suggestions

**Key Features:**
- Lazy text extraction
- Score caching
- Error recovery
- User-friendly messages

### useResumeUpload

**File Management:**
- PDF selection
- Upload to cloud storage
- Progress tracking
- Deletion

**Key Features:**
- Base64 encoding for React Native
- Plan-based limits (free: 3, pro: unlimited)
- Error handling

### useAIChat

**Conversation:**
- Message history
- Greeting detection
- Domain filtering
- Persistence

**Key Features:**
- Local greeting responses
- System prompt personalization
- Optimistic UI updates
- DB sync on success

---

## SCREEN COMPONENTS

### ResumeScreen

**Purpose:** Resume management hub
**Features:**
- Upload new resumes
- View resume list
- Trigger ATS analysis
- Delete resumes
- Empty state guidance

**States:**
- Loading
- Empty (no resumes)
- List (with resumes)

### ATSScoreScreen

**Purpose:** Display ATS analysis results
**Features:**
- Score visualization (ring + bars)
- Keyword analysis
- Strengths/improvements
- AI summary
- "Improve with AI" CTA

**Sections:**
- Overall score ring
- Metric breakdown (4 bars)
- Found/missing keywords
- Accordion sections (strengths, improvements)
- AI summary card

### ImprovedResumePreviewScreen

**Purpose:** Preview and export optimized resume
**Features:**
- Real-time optimization animation
- Resume preview
- PDF export
- Share functionality

**Phases:**
- Loading (with pulsing animation)
- Preview (full resume display)
- Error (with retry option)

### AIScreen

**Purpose:** AI career coaching hub
**Features:**
- Chat tab (conversational AI)
- Interview tab (practice interviews)
- Tab switching
- Message history

**Segments:**
- Chat (default)
- Interview (practice)

---

## DATA FLOW

### Resume Generation Flow

```
ResumeScreen
  ↓
useResumeEngine.buildResume()
  ↓
buildResumePrompt(formData)
  ↓
generateGeminiTextWithRetry(prompt)
  ↓
parseGeminiJson<GeneratedResume>()
  ↓
sanitizeGeneratedResume()
  ↓
dispatch({ type: 'GENERATE_SUCCESS', generatedResume })
  ↓
ResumeScreen → ATSScoreScreen (preview phase)
```

### ATS Scoring Flow

```
ResumeScreen
  ↓
useAtsScore.scoreResume(resumeId)
  ↓
Fetch resume from Supabase
  ↓
Extract text (if needed)
  ↓
buildAtsScorePrompt(resumeText, jobDescription)
  ↓
generateGeminiTextWithRetry(prompt)
  ↓
parseGeminiJson<GeminiAts>()
  ↓
Save to ats_scores table
  ↓
Cache on resumes table
  ↓
Navigate to ATSScoreScreen
```

### Resume Improvement Flow

```
ATSScoreScreen
  ↓
"Improve with AI" button
  ↓
ImprovedResumePreviewScreen
  ↓
Fetch ATS report + resume text
  ↓
generateImprovedResume(input)
  ↓
buildImprovePrompt(input)
  ↓
generateGeminiTextWithRetry(prompt)
  ↓
parseGeminiJson() + sanitize
  ↓
generateResumeHTML(formShape, generatedResume)
  ↓
Display preview
  ↓
Export PDF or Share
```

### AI Chat Flow

```
AIScreen (Chat tab)
  ↓
useAIChat.send(userText)
  ↓
Detect greeting? → Local response
  ↓
Build system prompt + history
  ↓
generateGeminiWithContext(params)
  ↓
Save user message to DB
  ↓
Save assistant response to DB
  ↓
Update UI with real DB IDs
```

---

## ERROR HANDLING

### Error Types

```typescript
// Gemini errors
GeminiError {
  code: 'invalid_key' | 'invalid_request' | 'rate_limit' | 
        'unavailable' | 'server_error' | 'empty_response' | 'unknown'
  message: string
}

// Resume engine errors
{
  message: string
  type?: 'network' | 'validation' | 'server'
  retryAction?: 'generate' | 'export'
}
```

### Error Recovery Strategies

#### Network Errors (503, 500, timeout)
- Exponential backoff retry
- Max 2 retries
- User-friendly message
- Retry button in UI

#### Quota Errors (429)
- Immediate throw (no retry)
- User message: "AI is busy, try again later"
- Tracking for monitoring

#### Validation Errors
- Per-field error messages
- Prevent form submission
- Clear guidance on fixes

#### Offline Errors
- Detect via NetInfo
- Save draft locally
- Show offline message
- Retry when online

### Error Messages

```typescript
// User-friendly messages
"No internet connection. Changes saved locally."
"Could not build resume. Please try again."
"Could not export PDF."
"Could not score resume"
"Resume not found. Please refresh and try again."
"AI service is busy. Please wait 30 seconds and try again."
```

---

## BEST PRACTICES

### State Management

1. **Use useReducer for complex state** - Resume builder uses reducer for multi-step form
2. **Persist critical state** - Draft auto-saves to AsyncStorage
3. **Validate state transitions** - Phase transitions validated in reducer
4. **Use refs for async coordination** - Prevent race conditions in voice interview

### Error Handling

1. **Classify errors** - Network vs validation vs server
2. **Provide retry mechanisms** - Exponential backoff for transient errors
3. **User-friendly messages** - Avoid technical jargon
4. **Log for debugging** - Console logs with context

### Performance

1. **Debounce auto-save** - 500ms delay prevents excessive writes
2. **Cache AI responses** - 5-minute TTL for identical prompts
3. **In-flight deduplication** - Single request per unique prompt
4. **Lazy load history** - Pagination for resume history

### Security

1. **API key in Supabase** - Never in client code
2. **Input truncation** - Limit prompt sizes
3. **Auth gating** - All features require login
4. **Data validation** - Validate all AI responses

---

## CONFIGURATION

### Environment Variables

```
EXPO_PUBLIC_GEMINI_API_KEY=<key>
EXPO_PUBLIC_SUPABASE_URL=<url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<key>
```

### Constants

```typescript
// Resume builder
MAX_EXPERIENCES = 4
TOTAL_STEPS = 5
DRAFT_VERSION = 2

// Gemini
PRIMARY_MODEL = "gemini-2.5-flash-lite"
MIN_REQUEST_GAP_MS = 6500
CACHE_TTL_MS = 5 * 60 * 1000

// Resume upload
MAX_FREE_RESUMES = 3
```

---

## MONITORING & DEBUGGING

### Key Metrics

- **Response time** - AI call latency
- **Token usage** - Tokens per feature
- **Error rate** - Failed requests percentage
- **Cache hit rate** - Cached vs fresh requests
- **User satisfaction** - Feedback scores

### Debug Logging

```typescript
// Gemini service
console.log("[Gemini] cache hit")
console.log("[Gemini] dedup - reusing in-flight request")
console.log("[Gemini] attempt X/Y failed - retrying in Xs")

// Resume engine
console.log("[ResumeEngine] Draft applied to state")
console.log("[ResumeEngine] Failed to persist draft")

// ATS scoring
console.log("[scoreResume] Resume record:", { ... })
console.log("[scoreResume] Final scores being saved:", { ... })
```

---

## FUTURE ENHANCEMENTS

### Short Term
- [ ] Further token optimization (target <100 tokens per prompt)
- [ ] Enhanced error recovery (smarter retry logic)
- [ ] Offline support (cache critical AI responses)

### Medium Term
- [ ] Performance monitoring dashboard
- [ ] Advanced context-aware AI
- [ ] Multi-modal AI (text + voice)
- [ ] Real-time interview coaching

### Long Term
- [ ] AI-powered resume generation from scratch
- [ ] Industry-specific AI models
- [ ] Salary negotiation simulation
- [ ] Career path recommendations

---

## CONCLUSION

Rankly is a well-architected React Native app with:

✅ **Robust AI integration** - Gemini API with proper error handling and rate limiting  
✅ **Complex state management** - Multi-step form with draft persistence  
✅ **Type-safe codebase** - Full TypeScript coverage  
✅ **User-friendly UX** - Clear error messages and loading states  
✅ **Scalable architecture** - Modular services and hooks  

The system is production-ready with clear optimization roadmap for scaling and enhanced features.

---

_Documentation complete. All systems documented and ready for reference._
