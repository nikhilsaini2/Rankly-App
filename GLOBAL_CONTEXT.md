# RANKLY — GLOBAL CONTEXT
**Last Updated:** April 2026  
**Purpose:** Single source of truth for the entire Rankly codebase. Reference this before making any changes.

---

## 1. TECH STACK

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Language | TypeScript (strict) |
| Navigation | React Navigation v6 (native stack + bottom tabs) |
| State | Redux Toolkit (theme) + useReducer (feature state) + React hooks |
| AI | Google Gemini API (`gemini-2.5-flash-lite`, v1 endpoint) |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Animations | React Native Reanimated v3 |
| UI Icons | Expo Vector Icons (Ionicons, Feather) |
| Gradients | expo-linear-gradient |
| Storage | AsyncStorage (local drafts/prefs), Supabase Storage (files) |
| Speech | expo-speech (TTS), expo-speech-recognition (STT) |
| PDF | expo-print + expo-sharing |
| Safe Area | react-native-safe-area-context |
| System Bars | expo-navigation-bar |

---

## 2. PROJECT STRUCTURE

```
Rankly/
├── App.tsx                        # Root: providers, NavigationContainer, GlobalBackground
├── GLOBAL_CONTEXT.md              # This file
├── src/
│   ├── components/
│   │   ├── atoms/                 # Button, Card, Input, Pill, Toast, ScoreRing, ScoreBar, Skeleton, Badge, ProgressRing, PressableScale, AppName
│   │   ├── molecules/             # LocationAutocomplete
│   │   ├── organisms/             # (reserved)
│   │   ├── layouts/               # HeroHeader, profileHeader, profileActions, profileStats
│   │   ├── GlobalBackground.tsx   # LinearGradient full-screen background
│   │   └── ErrorBoundary.tsx
│   ├── constants/
│   │   ├── tabs.ts                # TABS array (Home, Resume, AI, Profile)
│   │   ├── options.ts
│   │   ├── content.ts             # NOTIF_STORAGE_KEY etc.
│   │   └── all.ts
│   ├── feature/
│   │   ├── interview/             # Full interview feature module
│   │   └── resume/                # Full resume feature module
│   ├── hooks/
│   │   ├── useProfile.ts          # Fetch/cache user profile
│   │   ├── useHome.ts             # Home screen stats (scores, counts)
│   │   ├── useAIChat.ts           # AI chat with Gemini context
│   │   ├── useAIChatIntegration.ts
│   │   ├── useAtsScore.ts         # ATS scoring pipeline
│   │   ├── useGemini.ts
│   │   ├── useResumeUpload.ts     # PDF upload to Supabase Storage
│   │   ├── useProfileStats.ts
│   │   └── useRemoteConfig.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx      # Auth gate (session check)
│   │   ├── AppNavigator.tsx       # Main stack (authenticated)
│   │   ├── AuthNavigator.tsx      # Auth stack (login/register)
│   │   ├── BottomTabs.tsx         # Tab navigator
│   │   └── TabBar.tsx             # Custom floating pill tab bar
│   ├── screens/
│   │   ├── home/HomeScreen.tsx
│   │   ├── ai/AIScreen.tsx
│   │   ├── profile/ProfileScreen.tsx
│   │   ├── salary/SalaryNegotiationScreen.tsx
│   │   ├── premium/PremiumScreen.tsx
│   │   └── PdfViewer/index.tsx
│   ├── services/
│   │   ├── gemini/                # Gemini API client + prompts
│   │   ├── supabase/              # Supabase client + auth helpers
│   │   ├── profile/               # Profile CRUD
│   │   ├── resume/                # Resume service, history, storage
│   │   ├── interview/             # Interview history service
│   │   ├── premium/               # Plan limits, feature matrix
│   │   └── local/                 # Local storage service
│   ├── store/
│   │   ├── store.ts               # Redux store
│   │   ├── themeSlice.ts          # dark/light mode toggle
│   │   ├── ThemePersistence.tsx   # Persists theme to AsyncStorage
│   │   └── SystemBarsManager.tsx  # Syncs status bar + nav bar to theme
│   ├── theme/
│   │   ├── color.ts               # Dark theme tokens
│   │   ├── lightTheme.ts          # Light theme tokens
│   │   ├── useAppTheme.ts         # Hook: returns active theme colors
│   │   ├── elevation.ts           # Shadow/elevation helpers
│   │   ├── radius.ts, spacing.ts, typography.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── navigation.types.ts    # All navigation param lists
│   │   ├── common.types.ts        # User, AtsScoreRow, ResumeRow, ChatMessage
│   │   └── interview.types.ts     # Interview engine types
│   ├── utils/
│   │   ├── gemini.ts              # extractJsonPayload, parseGeminiJson, handleGeminiError
│   │   ├── score.ts               # scoreTierColor, scoreTierLabel, getInterviewResultMessage
│   │   ├── date.ts, format.ts
│   │   ├── greetingDetection.ts
│   │   ├── nameValidation.ts
│   │   ├── resilience.ts
│   │   └── geminiErrorHandler.ts
│   └── validation/
│       └── auth.schema.ts
```

---

## 3. NAVIGATION ARCHITECTURE

### Full Tree
```
RootNavigator
├── AuthNavigator (unauthenticated)
│   ├── Onboarding
│   ├── Login
│   └── Register
└── AppNavigator (authenticated — NativeStack)
    ├── Tabs (BottomTabNavigator)
    │   ├── Home
    │   ├── Resume
    │   ├── AI
    │   └── Profile
    ├── AtsScore          { resumeId, scoreId? }   — slide_from_right
    ├── SalaryNegotiation {}                        — fullScreenModal, slide_from_bottom
    ├── ResumeBuilder     {}                        — iOS: fullScreenModal / Android: card
    ├── PdfViewer         { url, fileName }         — slide_from_right
    ├── ImprovedResumePreview { resumeId, scoreId } — iOS: fullScreenModal / Android: card
    ├── InterviewHistory  {}                        — slide_from_right
    ├── ResumeHistory     {}                        — slide_from_right
    └── Premium           {}                        — slide_from_right
```

### Navigation Types (`src/types/navigation.types.ts`)
```typescript
type RootStackParamList = {
  Tabs: undefined
  AtsScore: { resumeId: string; scoreId?: string }
  VoiceInterview: { role, difficulty, sessionType, questionCount }
  SalaryNegotiation: undefined
  ResumeBuilder: undefined
  PdfViewer: { url: string; fileName: string }
  ImprovedResumePreview: { resumeId: string; scoreId: string }
  InterviewHistory: undefined
  ResumeHistory: undefined
  Premium: undefined
}

type RootTabParamList = {
  Home: undefined
  Resume: undefined
  AI: { atsContext?: string; initialSegment?: 'chat' | 'interview' } | undefined
  Profile: undefined
}
```

### Custom TabBar (`src/navigation/TabBar.tsx`)
- Floating pill design with `borderRadius: 30`, `marginHorizontal: 10`
- Active tab: LinearGradient pill (primary → primaryDark) with icon + label
- Inactive tab: icon + muted label
- Uses `useSafeAreaInsets` for `marginBottom`
- Tabs: Home, Resume, AI, Profile

---

## 4. THEME SYSTEM

### Architecture
- Redux `themeSlice` stores `mode: 'dark' | 'light'`
- `ThemePersistence` loads/saves to AsyncStorage on mount
- `useAppTheme()` hook returns active color tokens
- `SystemBarsManager` syncs Android nav bar color + icon style to theme

### Dark Theme (`src/theme/color.ts`)
```
background:   #0A0812    surface:      #130F1F    surfaceAlt:   #1C1830
primary:      #8B5CF6    primaryDark:  #6D28D9    accent:       #10B981
danger:       #EF4444    warning:      #F97316    textPrimary:  #FAF9FF
textSecondary:#A09ABA    textMuted:    #6B6480    border:       #2A2440
```

### Light Theme (`src/theme/lightTheme.ts`)
```
background:   #F3F4F8    surface:      #FFFFFF    surfaceAlt:   #F1F2F6
primary:      #8B5CF6    accent:       #10B981    border:       #D1D5DB
```

### SystemBarsManager
- Sets Android nav bar background to `theme.background` (prevents black gap on keyboard dismiss)
- Sets nav bar icon style: dark theme → `"light"` icons, light theme → `"dark"` icons
- Initial color set in `App.tsx` before Redux hydrates: `#0A0812`

### GlobalBackground (`src/components/GlobalBackground.tsx`)
- Renders `LinearGradient` as `StyleSheet.absoluteFill` behind all content
- Adds `<View style={{ height: insets.top }} />` for status bar spacing

---

## 5. SCREENS

### HomeScreen (`src/screens/home/HomeScreen.tsx`)
- Displays greeting, user avatar, credits
- Stats row: highest ATS score, resume count, interview session count
- Latest score card with CTA to ATS report
- Quick actions grid (navigate to features)
- Career tips section
- Uses `useHome()` + `useProfile()` hooks
- `useFocusEffect` silently refetches stats on tab focus

### AIScreen (`src/screens/ai/AIScreen.tsx`)
- Two segments: **Chat** and **Interview** (tab switcher)
- Chat: conversational AI career coach via `useAIChat`
- Interview: `InterviewScreen` component (mock interview engine)
- Accepts route params: `atsContext` (auto-sends ATS context to chat), `initialSegment`
- History button navigates to `InterviewHistory` (saves session state first)
- `KeyboardAvoidingView` with `behavior="padding"`, `keyboardVerticalOffset=35`

### ProfileScreen (`src/screens/profile/ProfileScreen.tsx`)
- Shows avatar (with animated ring), plan badge, credits
- Stats strip: resumes, best ATS, interviews
- Bio card, settings card (notifications, theme toggle, history links, plan)
- Danger zone (sign out, delete account)
- Edit mode: inline form with save/cancel action bar
- Avatar upload via `expo-image-picker` → Supabase Storage
- `KeyboardAvoidingView` wraps edit form

### SalaryNegotiationScreen (`src/screens/salary/SalaryNegotiationScreen.tsx`)
- **Phase: input** — form with job title, company, salary, currency (USD/INR/EUR), experience, job type, location (LocationAutocomplete), industries
- **Phase: loading** — pulsing animation with rotating messages
- **Phase: results** — verdict banner, market data, leverage points, negotiation script, email template, tactics
- History tab: saved negotiations from Supabase `salary_negotiations` table
- AI analysis via Gemini with client-side safety checks (verdict/suggestedAsk validation)
- `KeyboardAvoidingView` with `behavior="padding"` (both platforms)
- `ScrollView` with `flexGrow: 1` on `scrollContent`, `paddingBottom: 16`
- Presented as `fullScreenModal` on both iOS and Android

### PremiumScreen (`src/screens/premium/PremiumScreen.tsx`)
- Shows current plan (Free/Pro), credits balance
- Usage snapshot: resumes used, interviews completed, best ATS score
- Sync status rows (interview history, salary history, resume history)
- Plan comparison matrix (Free vs Pro features)
- Upgrade CTA (billing not yet connected)

---

## 6. FEATURE: RESUME

### Module Location: `src/feature/resume/`

### Screens
| Screen | Purpose |
|---|---|
| `ResumeScreen` | Upload PDFs, view list, trigger ATS analysis |
| `ATSScoreScreen` | Display ATS report with score ring, bars, keywords, accordion |
| `ResumeBuilderScreen` | 5-step AI resume builder form |
| `ImprovedResumePreviewScreen` | AI-optimized resume preview + PDF export |
| `ResumeHistoryScreen` | View/export/delete past generated resumes |

### ResumeBuilderScreen — 5 Steps
```
Step 1: Personal Info    (fullName*, email*, phone, linkedin, city)
Step 2: Career Profile   (targetRole*, experienceLevel*, industry*, skills*)
Step 3: Work Experience  (jobTitle*, company*, duration* per role; up to 4 roles)
Step 4: Education        (degree*, institution*, graduationYear*, grade, certifications, languages)
Step 5: Preferences      (tone*, topAchievement, targetCompanies, specialInstructions)
```
- Draft auto-saves to AsyncStorage every 500ms (debounced)
- Restore modal on re-open if meaningful draft exists
- Phase transitions: `input → loading → preview → exported`

### useResumeEngine Hook (`src/feature/resume/hooks/useResumeEngine.ts`)
- Manages all resume builder state via `resumeEngineReducer`
- Key methods: `handleNext()`, `handleBack()`, `buildResume()`, `exportAndShare()`, `peekDraft()`, `applyDraft()`, `clearDraft()`, `fetchResumeHistory()`

### Resume Generation Flow
```
buildResume()
  → buildResumePrompt(formData)
  → generateGeminiTextWithRetry(prompt)
  → parseGeminiJson<GeneratedResume>()
  → sanitizeGeneratedResume()
  → dispatch GENERATE_SUCCESS
  → phase: preview
```

### Generated Resume Shape
```typescript
interface GeneratedResume {
  professionalSummary: string        // 3 sentences, ~60 words
  enhancedExperiences: {
    jobTitle, company, duration
    bulletPoints: string[]           // max 4, max 20 words each
  }[]
  coreSkills: string[]               // 10-12 items
  atsKeywords: string[]              // 8 items
}
```

### ATS Scoring Flow
```
scoreResume(resumeId, jobDescription?)
  → fetch resume from Supabase
  → extract text (via Gemini if needed)
  → buildAtsScorePrompt(text, fileName, jd?)
  → generateGeminiTextWithRetry(prompt)
  → parseGeminiJson<GeminiAts>()
  → save to ats_scores table
  → cache on resumes table
  → navigate to ATSScoreScreen
```

### ATS Score Shape
```typescript
interface AtsScoreRow {
  overallScore, keywordScore, formatScore, contentScore, readabilityScore
  keywordsFound: string[], keywordsMissing: string[]
  feedback: { strengths: string[], improvements: string[] }
  aiSummary: string
}
```

### Resume History
- Cloud: `resume_builds` Supabase table
- Local: AsyncStorage fallback
- `ResumeHistoryScreen` merges both sources, deduplicates by ID
- Two types: `"Generated"` (builder) and `"AI Optimized"` (ATS improve)

---

## 7. FEATURE: INTERVIEW

### Module Location: `src/feature/interview/`

### InterviewScreen (`src/feature/interview/InterviewScreen.tsx`)
- Embedded inside `AIScreen` (not a standalone stack screen)
- Props: `defaultRole`, `onDiscussCoach`, `onViewHistory`, `onRegisterHistoryHandler`, `insetsBottom`

### Interview Phases
```
idle → ready → recording → processing → feedback → complete
```

### useInterviewEngine Hook
- Manages full interview state via `reducer`
- Session persisted to AsyncStorage on every state change (for resume on nav-away)
- Parallel answer evaluation on last question via `Promise.all`
- Saves completed session to Supabase `interview_sessions` + `interview_questions` tables
- Speech: `expo-speech-recognition` (STT) + `expo-speech` (TTS)
- Offline detection via `@react-native-community/netinfo`

### Session Config
```typescript
interface SessionConfig {
  role: string
  difficulty: 'easy' | 'medium' | 'hard'
  sessionType: 'behavioral' | 'technical' | 'mixed'
  questionCount: 3 | 5 | 10
}
```

### Answer Shape
```typescript
interface Answer {
  question, transcript, score: number (0-100)
  overall, strengths: string[], improvements: string[], tip
}
```

### Session Restore
- On `AIScreen` mount, checks AsyncStorage for saved session
- Shows `RestoreModal` (Resume Session / Start New) if session found
- `restoreSession()` force-resets recording/speaking state before restoring

### InterviewHistoryScreen (`src/feature/interview/screens/InterviewHistoryScreen.tsx`)
- Standalone stack screen (navigated from Profile or AI screen history button)
- Merges cloud (`interview_sessions`) + local (AsyncStorage) history

---

## 8. AI / GEMINI SERVICE

### Location: `src/services/gemini/gemini.ts`

### Model Config
```
Model:    gemini-2.5-flash-lite
Endpoint: v1 (not v1beta — higher quota)
Temp:     0.4 (structured), 0.7 (chat)
MaxTokens: 1024
```

### API Key
- Fetched from Supabase `app_config` table (`key = 'gemini_api_key'`)
- Falls back to `EXPO_PUBLIC_GEMINI_API_KEY` env var
- Cached in memory after first fetch

### Core Functions
```typescript
generateGeminiText(prompt, modelName?)
  // Single call with cache + in-flight dedup

generateGeminiTextWithRetry(prompt, maxRetries=2, baseDelayMs=4000)
  // Retries on 503/500/network errors, never retries 429

generateGeminiWithContext(params)
  // Multi-turn chat with history sanitization
  // Injects system prompt as first user+model turn (v1 compatible)
```

### Rate Limiting
- `MIN_REQUEST_GAP_MS = 1000` (global queue)
- Response cache: 5-minute TTL, max 20 entries, djb2 hash keys
- In-flight deduplication: identical prompts share one request

### Error Codes
```typescript
type GeminiErrorCode = 
  'invalid_key' | 'invalid_request' | 'rate_limit' | 
  'unavailable' | 'server_error' | 'empty_response' | 'unknown'
```

### Prompts (`src/services/gemini/prompts.ts`)
| Function | Purpose |
|---|---|
| `buildAtsScorePrompt` | ATS analysis (resume text + optional JD) |
| `buildInterviewQuestionsPrompt` | Generate N interview questions |
| `buildInterviewEvalPrompt` | Evaluate single answer (score 0-10) |
| `buildCareerCoachSystemPrompt` | System prompt for AI chat coach |

### Career Coach Scope
- **Allowed:** resumes, interviews, salary, career growth, job search, tech skills, certifications, roadmaps, cloud platforms, DevOps, AI/ML
- **Not allowed:** cooking, sports, entertainment, weather, politics, personal relationships
- Response style: warm, concise (2-4 lines default, 6-8 for complex topics), emojis OK

---

## 9. SUPABASE SCHEMA (Key Tables)

| Table | Purpose |
|---|---|
| `users` | User profiles (auth_id, first_name, last_name, plan, credits, etc.) |
| `resumes` | Uploaded PDF resumes (file_url, raw_text, status, latest_score) |
| `ats_scores` | ATS analysis results per resume |
| `resume_builds` | AI-generated resume history |
| `interview_sessions` | Interview session metadata (role, difficulty, score, completed) |
| `interview_questions` | Per-question data (question, user_answer, ai_feedback, score) |
| `salary_negotiations` | Salary coach analysis history |
| `chat_messages` | AI chat message history |
| `app_config` | Remote config (e.g. `gemini_api_key`) |

---

## 10. STATE MANAGEMENT

### Redux Store (`src/store/store.ts`)
- Single slice: `themeSlice` (`mode: 'dark' | 'light'`)
- Actions: `toggleTheme()`, `setTheme(mode)`, `loadTheme(mode)`
- Persisted via `ThemePersistence` component (AsyncStorage)

### Feature State (useReducer)
- `useResumeEngine` → `resumeEngineReducer` (complex multi-step form)
- `useInterviewEngine` → local `reducer` (interview session state machine)
- Both use `useRef` for async coordination (prevent stale closures)

### Key Hooks
```typescript
useProfile()     → { user, loading, error, refetch }
useHome()        → { latestScore, highestScore, resumeCount, sessionCount, firstName, loading, refetch }
useAIChat(user)  → { messages, loading, ready, send(text), clearChat() }
useAtsScore()    → { scoring, score, error, scoreResume, getLatestScore, getScoreById, getScoreHistory }
useResumeUpload()→ { uploading, progress, error, pickResume(), uploadResume(file), deleteResume(id, path) }
useProfileStats(userId) → { stats: { resumes, bestAts, interviews } }
```

---

## 11. PLANS & PREMIUM

### Plan Tiers: `'free' | 'pro'`

| Feature | Free | Pro |
|---|---|---|
| Resume uploads | 3 | Unlimited |
| Cloud history | Interview + salary | Interview + salary + higher limits |
| Credits | Visible | Visible |

### Key Functions (`src/services/premium/premiumService.ts`)
```typescript
canUploadResume(plan, currentCount): boolean
getResumeLimit(plan): number | null   // null = unlimited
getResumeRemainingLabel(plan, count): string
getPlanUsageSummary({ user, resumesUsed, interviewsCompleted }): PlanUsageSummary
```

---

## 12. ENVIRONMENT VARIABLES

```
EXPO_PUBLIC_GEMINI_API_KEY=<fallback key>
EXPO_PUBLIC_SUPABASE_URL=<url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<key>
```
Primary Gemini key is stored in Supabase `app_config` table, not in env.

---

## 13. KEYBOARD & SCROLL PATTERNS

### SalaryNegotiationScreen
- `KeyboardAvoidingView behavior="padding"` (both platforms)
- `keyboardVerticalOffset`: iOS=0, Android=50
- `ScrollView` with `flexGrow: 1` on `scrollContent`, `paddingBottom: 16`
- Presented as `fullScreenModal` (prevents black gap from tab bar)

### ProfileScreen
- `KeyboardAvoidingView behavior="padding"` iOS / `"height"` Android
- `keyboardVerticalOffset`: Android=80, iOS=0

### AIScreen
- `KeyboardAvoidingView behavior="padding"` (both), `keyboardVerticalOffset=35`

### ResumeBuilderScreen
- `KeyboardAvoidingView behavior="padding"` iOS / `"height"` Android

### Android Nav Bar Black Gap Fix
- `SystemBarsManager` calls `NavigationBar.setBackgroundColorAsync(theme.background)` on theme change
- Initial color set in `App.tsx`: `NavigationBar.setBackgroundColorAsync("#0A0812")`
- This prevents the black system nav bar from showing when keyboard opens/closes

---

## 14. SCORE UTILITIES (`src/utils/score.ts`)

```typescript
scoreTierColor(score: number): string
  // ≥75 → accent (#10B981), ≥50 → warning (#F97316), <50 → danger (#EF4444)

scoreTierLabel(score: number): string
  // ≥90 → "Excellent", ≥75 → "Great", ≥50 → "Good", <50 → "Needs Work"

getInterviewResultMessage(score: number): string
  // ≥80 → "Excellent performance!", ≥60 → "Good effort!", etc.
```

---

## 15. LOCATION AUTOCOMPLETE

### Component: `src/components/molecules/LocationAutocomplete.tsx`
- Used in `SalaryNegotiationScreen` for location field
- Returns `PlaceSelection { description: string, placeId: string }`
- Integrates with Google Places API

---

## 16. TOAST SYSTEM

### Component: `src/components/atoms/Toast.tsx`
- `ToastProvider` wraps app in `App.tsx`
- `useToast()` hook returns `toast(message, type: 'success' | 'error' | 'info')`
- Used across all screens for non-blocking feedback

---

## 17. ERROR HANDLING PATTERNS

### Gemini Errors
- 429/quota → never retry, show "AI is busy" message
- 503/500/network → exponential backoff, max 2 retries
- Empty response → `GeminiError('empty_response')`
- `handleGeminiError(error, retryFn?)` in `src/utils/gemini.ts`

### Resume Engine Errors
```typescript
{ message: string, type?: 'network' | 'validation' | 'server', retryAction?: 'generate' | 'export' }
```

### Interview Engine Errors
- Quota errors → friendly message, answers still recorded
- Offline → stub answers with "pending evaluation" message
- Per-answer evaluation wrapped in `.catch()` so one failure doesn't abort all

---

## 18. CONSTANTS

```typescript
// Gemini
PRIMARY_MODEL = "gemini-2.5-flash-lite"
MIN_REQUEST_GAP_MS = 1000
CACHE_TTL_MS = 5 * 60 * 1000   // 5 min

// Resume builder
MAX_EXPERIENCES = 4
TOTAL_STEPS = 5
DRAFT_VERSION = 2

// Resume upload
MAX_FREE_RESUMES = 3

// Interview
QUESTION_COUNTS = [3, 5, 10]
DIFFICULTIES = ['easy', 'medium', 'hard']
SESSION_TYPES = ['behavioral', 'technical', 'mixed']
```

---

## 19. SALARY COACH DETAILS

### SalaryNegotiationScreen (`src/screens/salary/SalaryNegotiationScreen.tsx`)

**Input Fields:**
- Job Title (required, validated)
- Company (optional)
- Offered Salary + Currency (USD/INR/EUR)
- Experience (0-1 yrs, 2-3 yrs, 4-6 yrs, 7-10 yrs, 10+ yrs)
- Job Type (Full Time / Remote)
- Location (LocationAutocomplete)
- Industries (multi-select pills)

**Analysis Output:**
```typescript
interface SalaryAnalysis {
  verdict: 'Below Market' | 'Fair Offer' | 'Above Market'
  marketMin, marketMedian, marketMax: number
  percentageDiff: number
  suggestedAsk: number          // always >= offered salary
  leveragePoints: string[]
  negotiationScript: string
  emailTemplate: string
  tactics: string[]
}
```

**Client-side Safety:**
- Verdict re-derived from `percentageDiff` (>5% = Above, <-5% = Below, else Fair)
- `suggestedAsk` clamped to >= offered salary

**History:** Saved to Supabase `salary_negotiations` table, shown in History tab

---

## 20. PROFILE SCREEN DETAILS

### ProfileScreen (`src/screens/profile/ProfileScreen.tsx`)

**Sections:**
1. `ProfileHero` — avatar (animated ring), name, plan badge, credits, edit button
2. `StatsStrip` — animated counters (resumes, best ATS, interviews)
3. `BioCard` — bio text display
4. `SettingsCard` — notifications toggle, theme toggle, history links, plan management
5. `DangerZone` — sign out, delete account, app version

**Edit Mode:**
- Inline form replaces bio/settings
- Fields: firstName, lastName, bio, role, experienceLevel, industry, linkedinUrl
- Dirty check prevents unnecessary saves
- `EditProfileForm` + `EditActionBar` (Cancel / Save Changes)

**Avatar Upload:**
- `expo-image-picker` → base64 → Supabase Storage `avatars` bucket
- `updateUserProfile({ avatarUrl })` saves public URL

---

_End of GLOBAL_CONTEXT.md — keep this file updated when adding new features or changing architecture._
