# Design Document: AI Resume Builder

## Overview

The AI Resume Builder is a multi-step, AI-powered resume generation feature within the Rankly app. Users complete a 5-step form covering personal details, target role, work experience, education, and tone preferences. The collected data is sent to Google Gemini (gemini-2.5-flash) which returns a structured JSON resume. The output is rendered as a styled preview and can be exported as a PDF, shared, and saved to Supabase history.

The feature lives at `src/feature/resume/` and is already substantially scaffolded. The design describes the complete intended architecture, filling in gaps and formalizing contracts for the remaining implementation work.

### Key Design Decisions

- **Reducer-first state machine**: All state transitions go through `resumeEngineReducer` with an explicit valid-transitions map, making invalid states unrepresentable.
- **Hook orchestration**: `useResumeEngine` owns all async logic and side effects; the screen is purely presentational.
- **Fail-open persistence**: Supabase save failures do not block PDF export — the user always gets their file.
- **Debounced draft**: AsyncStorage draft is written within 500ms of any form change, enabling seamless session restoration.
- **Resilience wrapper**: All Gemini calls go through `withResilience()` for retry/timeout handling, with quota errors (429) bypassing retry entirely.

---

## Architecture

```
ResumeBuilderScreen (presentational)
  └── useResumeEngine (orchestration hook)
        ├── resumeEngineReducer (pure state machine)
        ├── GeminiService (AI generation)
        │     └── generateGeminiTextWithRetry + withResilience
        ├── buildResumePrompt (prompt construction)
        ├── parseGeminiJson + GeminiResumeSchema (response parsing/validation)
        ├── generateResumeHTML (PDF template)
        ├── expo-print (PDF generation)
        ├── expo-sharing (share sheet)
        ├── Supabase (history persistence)
        ├── AsyncStorage (draft persistence)
        └── NetInfo (connectivity check)
```

### Phase State Machine

```
         ┌──────────────────────────────────────┐
         ▼                                      │
      [input] ──────────────► [loading] ────────┤
         ▲                       │              │
         │                       ▼              │
         │                   [preview] ─────────┤
         │                       │              │
         └───────────────── [exported] ◄────────┘
```

Valid transitions (enforced by reducer):
- `input` → `loading`, `preview`, `input`
- `loading` → `preview`, `input`, `loading`
- `preview` → `exported`, `input`, `preview`, `loading`
- `exported` → `input`, `exported`, `preview`

---

## Components and Interfaces

### File Structure

```
src/feature/resume/
  screens/
    ResumeBuilderScreen.tsx     # Presentational screen (entry point)
  hooks/
    useResumeEngine.ts          # Orchestration hook
  core/
    resumeReducer.ts            # Pure reducer + INITIAL_RESUME_STATE
  components/
    ResumePreview.tsx           # Generated resume display
    ResumeHistoryList.tsx       # History tab list
    StepIndicator.tsx           # Step progress bar
    StepTitleCard.tsx           # Step header card
    ExperienceCard.tsx          # Work experience entry form
    FieldInput.tsx              # Styled text input
    PillSelector.tsx            # Single-select pill row
  utils/
    resumePrompt.ts             # buildResumePrompt()
    resumeHTML.ts               # generateResumeHTML()
    validation.ts               # ResumeFormSchema, GeminiResumeSchema
  types/
    resume.types.ts             # All TypeScript types
  constants/
    resume.constants.ts         # LOADING_MESSAGES, STEP_TITLES, etc.
  styles/
    resume.styles.ts            # StyleSheet definitions
```

### useResumeEngine Public Interface

```typescript
interface ResumeEngineReturn {
  state: ResumeEngineState;
  dispatch: Dispatch<ResumeEngineAction>;
  handleNext: () => void;
  handleBack: (navigationGoBack: () => void) => void;
  buildResume: () => Promise<void>;
  exportPDF: () => Promise<void>;
  shareResume: () => Promise<void>;
  fetchResumeHistory: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  deleteResumeHistory: (id: string) => void;
  clearDraft: () => Promise<void>;
  restoreDraft: () => Promise<boolean>;
  canProceed: () => boolean;
}
```

### ResumePreview Props

```typescript
interface ResumePreviewProps {
  formData: ResumeFormData;
  generatedResume: GeneratedResume;
  isHistoryView: boolean;
  exporting: boolean;
  onExport: () => void;
  onShare: () => void;
  onReset: () => void;
  onBackToHistory: () => void;
}
```

---

## Data Models

### ResumeEngineState

```typescript
interface ResumeEngineState {
  phase: 'input' | 'loading' | 'preview' | 'exported';
  currentStep: number;           // 1–5
  inputTab: 'form' | 'history';
  formData: ResumeFormData;
  generatedResume: GeneratedResume | null;
  pdfUri: string | null;
  selectedResume: ResumeHistoryItem | null;
  resumeHistory: ResumeHistoryItem[];
  asyncStatus: 'idle' | 'loading' | 'success' | 'error';
  loadingMessage: number;        // index into LOADING_MESSAGES
  error: ResumeError | null;
  lastSaved?: number;
}

interface ResumeError {
  message: string;
  type?: 'network' | 'validation' | 'server';
  retryAction?: 'generate' | 'export';
}
```

### ResumeFormData

```typescript
interface ResumeFormData {
  // Step 1 — Personal
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  city: string;
  // Step 2 — Role
  targetRole: string;
  experienceLevel: string;
  industry: string;
  skills: string;
  // Step 3 — Experience
  experiences: WorkExperience[];
  // Step 4 — Education
  degree: string;
  institution: string;
  graduationYear: string;
  grade: string;
  certifications: string;
  languages: string;
  // Step 5 — Tone
  tone: string;
  topAchievement: string;
  targetCompanies: string;
  specialInstructions: string;
}

interface WorkExperience {
  jobTitle: string;
  company: string;
  duration: string;
  achievement1: string;
  achievement2: string;
}
```

### GeneratedResume (AI Output)

```typescript
interface GeneratedResume {
  professionalSummary: string;
  enhancedExperiences: EnhancedExperience[];
  coreSkills: string[];       // up to 12 items
  atsKeywords: string[];      // exactly 8 items
}

interface EnhancedExperience {
  jobTitle: string;
  company: string;
  duration: string;
  bulletPoints: string[];     // exactly 3 items
}
```

### ResumeHistoryItem (Supabase `resume_builds` table)

```typescript
interface ResumeHistoryItem {
  id: string;
  user_id: string;
  full_name: string;
  target_role: string;
  experience_level: string | null;
  industry: string | null;
  tone: string | null;
  skills: string | null;
  professional_summary: string | null;
  core_skills: string[] | null;
  enhanced_experiences: EnhancedExperience[] | null;
  ats_keywords: string[] | null;
  pdf_uri: string | null;
  created_at: string;
}
```

### Draft Schema (AsyncStorage `@resume_builder_draft_v1`)

```typescript
interface ResumeDraft {
  formData: ResumeFormData;
  currentStep: number;
  phase: 'input' | 'preview';   // never persists 'loading' or 'exported'
  generatedResume: GeneratedResume | null;
  pdfUri: string | null;
  version: number;               // currently 2
  lastSaved: number;             // Unix timestamp ms
}
```

### Reducer Actions

```typescript
type ResumeEngineAction =
  | { type: 'SET_TAB'; tab: InputTab }
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_FORM'; data: Partial<ResumeFormData> }
  | { type: 'UPDATE_EXPERIENCE'; index: number; field: keyof WorkExperience; value: string }
  | { type: 'ADD_EXPERIENCE'; experience: WorkExperience }
  | { type: 'REMOVE_EXPERIENCE'; index: number }
  | { type: 'START_ASYNC'; messageIndex?: number }
  | { type: 'ABORT_ASYNC' }
  | { type: 'SET_ERROR'; error: ResumeError }
  | { type: 'SET_PHASE'; phase: ResumePhase }
  | { type: 'GENERATE_SUCCESS'; generatedResume: GeneratedResume }
  | { type: 'EXPORT_SUCCESS'; pdfUri: string }
  | { type: 'HISTORY_FETCH_SUCCESS'; history: ResumeHistoryItem[] }
  | { type: 'HISTORY_DELETE_SUCCESS'; id: string }
  | { type: 'LOAD_HISTORY_ITEM'; item: ResumeHistoryItem }
  | { type: 'RESTORE_SESSION'; state: Partial<ResumeEngineState> }
  | { type: 'RESET_BUILDER' }
  | { type: 'RESET_ALL' };
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: canProceed reflects required field completeness

*For any* step number (1–5) and any `ResumeFormData`, `canProceed()` should return `true` if and only if all required fields for that step are non-empty, and `false` otherwise.

**Validates: Requirements 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5**

---

### Property 2: Experience list is bounded by MAX_EXPERIENCES

*For any* sequence of `ADD_EXPERIENCE` actions dispatched to the reducer, `state.formData.experiences.length` should never exceed `MAX_EXPERIENCES` (4).

**Validates: Requirements 1.5, 12.6, 12.7**

---

### Property 3: Backward step navigation preserves form data

*For any* `ResumeEngineState` with `currentStep > 1` and any `formData`, dispatching `SET_STEP` to a lower step number should leave `formData` completely unchanged.

**Validates: Requirements 1.4**

---

### Property 4: buildResumePrompt includes all candidate profile fields

*For any* `ResumeFormData`, the string returned by `buildResumePrompt(data)` should contain `data.fullName`, `data.targetRole`, `data.experienceLevel`, `data.industry`, `data.skills`, and `data.tone`.

**Validates: Requirements 3.2**

---

### Property 5: buildResumePrompt always requests JSON-only output

*For any* `ResumeFormData`, the string returned by `buildResumePrompt(data)` should contain the JSON-only instruction (no markdown, no backticks, no preamble).

**Validates: Requirements 3.3**

---

### Property 6: parseGeminiJson round-trips valid JSON objects

*For any* valid `GeneratedResume` object, serializing it to a JSON string and passing it through `parseGeminiJson()` should return an object deeply equal to the original.

**Validates: Requirements 3.7**

---

### Property 7: GeminiResumeSchema rejects structurally incomplete responses

*For any* object missing one or more of `professionalSummary`, `enhancedExperiences`, `coreSkills`, or `atsKeywords`, `GeminiResumeSchema.isValid(obj)` should return `false`.

**Validates: Requirements 3.4, 3.5**

---

### Property 8: ResumeFormSchema rejects invalid email and URL formats

*For any* string that is not a valid email address, `ResumeFormSchema` should fail validation on the `email` field. For any string that is not a valid URL, it should fail validation on the `linkedin` field when provided.

**Validates: Requirements 2.8**

---

### Property 9: Phase transitions respect the valid-transitions map

*For any* current `phase` and any target `phase` passed to `SET_PHASE`, the reducer should only change `phase` if the target is in the valid transitions set for the current phase; otherwise it should return state unchanged.

**Validates: Requirements 9.1, 9.2**

---

### Property 10: Phase is always a valid value after any action sequence

*For any* sequence of `ResumeEngineAction` dispatches applied to any starting state, the resulting `state.phase` should always be one of `['input', 'loading', 'preview', 'exported']`.

**Validates: Requirements 9.6**

---

### Property 11: RESET_BUILDER preserves resumeHistory and resets all other fields

*For any* `ResumeEngineState`, after dispatching `RESET_BUILDER`, `state.resumeHistory` should equal the pre-reset value, and all other tracked fields (`phase`, `currentStep`, `inputTab`, `formData`, `generatedResume`, `pdfUri`, `selectedResume`, `asyncStatus`, `error`) should equal their `INITIAL_RESUME_STATE` values.

**Validates: Requirements 9.4**

---

### Property 12: Draft always contains version and lastSaved fields

*For any* form state change while `inputTab === 'form'` and `phase !== 'exported'`, the draft written to AsyncStorage should contain a `version` field and a `lastSaved` timestamp.

**Validates: Requirements 5.2**

---

## Error Handling

### Error Classification

| Error Type | Trigger | `error.type` | `retryAction` | Phase After |
|---|---|---|---|---|
| No network | `NetInfo.fetch()` returns disconnected | `'network'` | `'generate'` | `'input'` |
| Validation failure | `ResumeFormSchema.validate()` throws | `'validation'` | none | `'input'` |
| Quota exhausted | Gemini returns 429 | `'server'` | `'generate'` | `'input'` |
| Malformed AI response | `GeminiResumeSchema.isValid()` returns false | `'server'` | `'generate'` | `'input'` |
| PDF generation failure | `expo-print` throws | `'server'` | `'export'` | `'preview'` |
| Supabase save failure | Supabase insert/update throws | — | — | continues to `'exported'` (fail-open) |

### Concurrency Guards

- `isGeneratingRef`: boolean ref set to `true` before `buildResume` starts, cleared in `finally`. Prevents duplicate generation calls.
- `isExportingRef`: same pattern for `exportPDF`.
- `abortControllerRef`: `AbortController` passed to `withResilience`. Aborted on unmount and when app backgrounds.
- AppState listener: on `background`/`inactive`, both refs are reset to `false` to allow future retries.

### Retry Strategy

```
buildResume():
  withResilience(generateGeminiTextWithRetry, { retries: 2 })
    └── generateGeminiTextWithRetry(prompt, maxRetries=1, baseDelay=10000ms)
          └── 429 → throw immediately (no retry)
          └── 503/500/network → exponential backoff, up to 1 internal retry
  Total max attempts: ~3 (2 outer + 1 inner)
```

---

## Testing Strategy

### Dual Testing Approach

Unit tests cover specific examples, edge cases, and error conditions. Property-based tests verify universal invariants across many generated inputs. Both are necessary for comprehensive coverage.

### Property-Based Testing Library

**[fast-check](https://github.com/dubzzz/fast-check)** — TypeScript-native, works in Jest/Vitest, no additional setup required.

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: ai-resume-builder, Property N: <property_text>`

### Property Test Implementations

**Property 1 — canProceed reflects required field completeness**
Generate random `ResumeFormData` with some required fields empty and some filled. For each step, assert `canProceed()` returns the expected boolean.

**Property 2 — Experience list bounded by MAX_EXPERIENCES**
Generate sequences of `ADD_EXPERIENCE` actions of arbitrary length. Assert `experiences.length <= 4` after each dispatch.

**Property 3 — Backward step navigation preserves form data**
Generate random `ResumeFormData` and a random step > 1. Dispatch `SET_STEP` to a lower step. Assert `formData` is deeply equal before and after.

**Property 4 & 5 — buildResumePrompt completeness**
Generate random `ResumeFormData`. Assert the prompt string contains all required profile fields and the JSON-only instruction.

**Property 6 — parseGeminiJson round-trip**
Generate random `GeneratedResume` objects. Serialize to JSON string, pass through `parseGeminiJson`, assert deep equality.

**Property 7 — GeminiResumeSchema rejects incomplete objects**
Generate objects with one or more required fields removed. Assert `GeminiResumeSchema.isValid()` returns false.

**Property 8 — ResumeFormSchema email/URL validation**
Generate arbitrary strings that are not valid emails/URLs. Assert schema validation fails on those fields.

**Property 9 — Phase transitions respect valid-transitions map**
Generate random `(currentPhase, targetPhase)` pairs. Assert reducer only changes phase for valid transitions.

**Property 10 — Phase invariant across action sequences**
Generate random sequences of `ResumeEngineAction` values. Apply each to the reducer. Assert `phase` is always in the valid set.

**Property 11 — RESET_BUILDER preserves history**
Generate random `ResumeEngineState`. Dispatch `RESET_BUILDER`. Assert `resumeHistory` is preserved and all other fields match initial values.

**Property 12 — Draft contains version and lastSaved**
Generate random form state changes. Mock `AsyncStorage.setItem`. Assert the saved draft always contains `version` and `lastSaved`.

### Unit Tests

- `buildResumePrompt`: specific examples verifying prompt structure for Fresher vs experienced candidates
- `resumeEngineReducer`: all action types with concrete before/after state snapshots
- `generateResumeHTML`: verify HTML output contains candidate name, role, summary, skills
- Draft restoration: mock AsyncStorage, verify `RESTORE_SESSION` is dispatched with correct data
- Error state rendering: verify error UI shows correct icon and retry button based on `error.type`
- Loading animation: verify `asyncStatus === 'loading'` triggers animation and message cycling

### Integration Tests

- `buildResume` with mocked `GeminiService`: verify full happy path (form → prompt → parse → GENERATE_SUCCESS)
- `buildResume` with mocked offline `NetInfo`: verify `SET_ERROR` with `type: 'network'`
- `buildResume` with mocked 429 response: verify no retry and `SET_ERROR` dispatched
- `exportPDF` with mocked `expo-print`: verify `EXPORT_SUCCESS` dispatched with URI
- `exportPDF` with Supabase failure: verify export still succeeds (fail-open)
- History fetch with mocked Supabase: verify `HISTORY_FETCH_SUCCESS` with correct data
- Hardware back button: verify correct phase transitions and navigation behavior
