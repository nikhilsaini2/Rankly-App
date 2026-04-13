# Requirements Document

## Introduction

The AI Resume Builder is a multi-step, AI-powered resume generation feature within the Rankly app. Users fill out a structured 5-step form covering personal details, target role, work experience, education, and tone preferences. The system sends this data to Google Gemini (gemini-2.5-flash-lite) and receives a structured JSON response containing a professional summary, impact-driven experience bullet points, core skills, and ATS keywords. The output is rendered as a styled resume preview and can be exported as a PDF, shared, and saved to the user's history in Supabase. The feature lives at `src/feature/resume/` and is accessed via the `ResumeBuilder` modal route.

---

## Glossary

- **ResumeBuilder**: The end-to-end feature encompassing the form, AI generation, preview, and export flow.
- **ResumeEngine**: The custom hook (`useResumeEngine`) that orchestrates all state, async operations, and side effects for the ResumeBuilder.
- **ResumeReducer**: The pure reducer function (`resumeEngineReducer`) that manages `ResumeEngineState` transitions.
- **ResumeFormData**: The typed data structure holding all user-provided inputs across the 5 form steps.
- **GeneratedResume**: The structured AI output containing `professionalSummary`, `enhancedExperiences`, `coreSkills`, and `atsKeywords`.
- **EnhancedExperience**: A single work experience entry with AI-generated `bulletPoints` following the impact-driven format.
- **ResumeHistoryItem**: A persisted resume record stored in the Supabase `resume_builds` table.
- **GeminiService**: The module at `src/services/gemini/gemini.ts` responsible for all Google Gemini API calls, rate limiting, caching, and retry logic.
- **ResumePrompt**: The function `buildResumePrompt()` that constructs the Gemini prompt from `ResumeFormData`.
- **ResumePreview**: The component that renders the `GeneratedResume` and `ResumeFormData` into a styled, human-readable resume layout.
- **ATS**: Applicant Tracking System — software used by employers to filter resumes by keyword relevance.
- **Draft**: A locally persisted (AsyncStorage) snapshot of the in-progress form state, used to restore work across sessions.
- **Phase**: The current stage of the ResumeBuilder flow — one of `input`, `loading`, `preview`, or `exported`.
- **AsyncStatus**: The current async operation state — one of `idle`, `loading`, `success`, or `error`.
- **Impact-Driven Bullet**: A resume bullet point following the pattern: Action Verb + What + How + Measurable Result + Business Impact.

---

## Requirements

### Requirement 1: Multi-Step Form Data Collection

**User Story:** As a job seeker, I want to fill out a structured multi-step form with my personal details, target role, work experience, education, and tone preferences, so that the AI has enough context to generate a high-quality, personalized resume.

#### Acceptance Criteria

1. THE ResumeBuilder SHALL present the form across exactly 5 sequential steps: Personal Info, Target Role, Work Experience, Education & Extras, and Final Touches.
2. WHEN the user completes a step and taps "Next", THE ResumeBuilder SHALL advance to the next step only if all required fields for the current step are filled.
3. IF a required field is empty when the user attempts to advance, THEN THE ResumeBuilder SHALL keep the user on the current step and disable the "Next" button.
4. THE ResumeBuilder SHALL allow the user to navigate back to any previously completed step without losing entered data.
5. THE ResumeBuilder SHALL allow up to 4 work experience entries, each containing job title, company, duration, and 2 achievement fields.
6. WHEN the user's experience level is "Fresher", THE ResumeBuilder SHALL not require work experience entries to advance past Step 3.
7. THE ResumeBuilder SHALL provide pill-selector UI components for experience level, industry, and tone fields, allowing single selection from predefined options.
8. THE ResumeFormData SHALL include: `fullName`, `email`, `phone`, `linkedin`, `city`, `targetRole`, `experienceLevel`, `industry`, `skills`, `experiences[]`, `degree`, `institution`, `graduationYear`, `grade`, `certifications`, `languages`, `tone`, `topAchievement`, `targetCompanies`, and `specialInstructions`.

---

### Requirement 2: Form Validation

**User Story:** As a job seeker, I want the form to validate my inputs before submission, so that I don't send incomplete or malformed data to the AI and receive a poor result.

#### Acceptance Criteria

1. WHEN the user attempts to advance from Step 1, THE ResumeBuilder SHALL require `fullName` and `email` to be non-empty strings.
2. WHEN the user attempts to advance from Step 2, THE ResumeBuilder SHALL require `targetRole`, `experienceLevel`, `industry`, and `skills` to be non-empty.
3. WHEN the user attempts to advance from Step 3 and `experienceLevel` is not "Fresher", THE ResumeBuilder SHALL require at least one experience entry with a non-empty `jobTitle`.
4. WHEN the user attempts to advance from Step 4, THE ResumeBuilder SHALL require `degree`, `institution`, and `graduationYear` to be non-empty.
5. WHEN the user attempts to advance from Step 5, THE ResumeBuilder SHALL require `tone` to be selected.
6. WHEN the user submits the form for AI generation, THE ResumeEngine SHALL validate the complete `ResumeFormData` against the `ResumeFormSchema` (Yup) before calling the GeminiService.
7. IF the `ResumeFormSchema` validation fails, THEN THE ResumeEngine SHALL dispatch a `SET_ERROR` action with `type: 'validation'` and SHALL NOT call the GeminiService.
8. THE ResumeFormSchema SHALL validate `email` as a valid email format and `linkedin` as a valid URL when provided.

---

### Requirement 3: AI Resume Generation

**User Story:** As a job seeker, I want the app to send my form data to Google Gemini and receive a structured, high-impact resume, so that I get a professionally written resume without manual writing effort.

#### Acceptance Criteria

1. WHEN the user taps "Build Resume" on Step 5, THE ResumeEngine SHALL construct a prompt via `buildResumePrompt()` and call the GeminiService.
2. THE ResumePrompt SHALL include the candidate's full profile: name, target role, experience level, industry, skills, location, tone, target companies, top achievement, special instructions, all work experiences, and education details.
3. THE ResumePrompt SHALL instruct Gemini to return ONLY a valid JSON object with no markdown, no backticks, and no preamble.
4. THE GeneratedResume JSON SHALL contain exactly: `professionalSummary` (string), `enhancedExperiences` (array of `EnhancedExperience`), `coreSkills` (array of up to 12 strings), and `atsKeywords` (array of 8 strings).
5. EACH `EnhancedExperience` SHALL contain `jobTitle`, `company`, `duration`, and `bulletPoints` (array of 3 strings), where each bullet follows the impact-driven format: Action Verb + What + How + Measurable Result + Business Impact.
6. THE `professionalSummary` SHALL be 3–4 sentences, written in the selected tone, and contain role-relevant ATS keywords.
7. WHEN the GeminiService returns a response, THE ResumeEngine SHALL parse it using `parseGeminiJson()` and validate the structure against `GeminiResumeSchema` (Yup).
8. IF the parsed response fails `GeminiResumeSchema` validation, THEN THE ResumeEngine SHALL dispatch `SET_ERROR` with `type: 'server'` and `retryAction: 'generate'`.
9. WHEN generation succeeds, THE ResumeEngine SHALL dispatch `GENERATE_SUCCESS` with the parsed `GeneratedResume` and transition `phase` to `preview`.

---

### Requirement 4: Network Resilience and Error Handling

**User Story:** As a job seeker, I want the app to handle network failures and AI errors gracefully, so that I don't lose my work and can retry without starting over.

#### Acceptance Criteria

1. BEFORE calling the GeminiService, THE ResumeEngine SHALL check network connectivity using `NetInfo.fetch()`.
2. IF the device has no internet connection, THEN THE ResumeEngine SHALL dispatch `SET_ERROR` with `type: 'network'` and `message: 'No internet connection. Changes saved locally.'` and SHALL NOT call the GeminiService.
3. THE ResumeEngine SHALL wrap GeminiService calls with `withResilience()`, configured with up to 2 retries for transient server errors (5xx, network timeouts).
4. IF the GeminiService returns a quota error (HTTP 429), THEN THE ResumeEngine SHALL NOT retry and SHALL dispatch `SET_ERROR` with a user-friendly message.
5. WHEN an error occurs during generation, THE ResumeEngine SHALL set `asyncStatus` to `'error'` and `phase` back to `'input'`.
6. THE ResumeBuilder SHALL display a dedicated error state UI showing the error message and a "Retry Action" button when `asyncStatus` is `'error'`.
7. WHEN the user taps "Retry Action", THE ResumeBuilder SHALL re-invoke the failed operation (`buildResume` or `exportPDF`) based on `error.retryAction`.
8. THE ResumeEngine SHALL use a ref (`isGeneratingRef`) to prevent concurrent duplicate generation calls.
9. WHEN the app moves to the background during generation, THE ResumeEngine SHALL release the `isGeneratingRef` lock to allow future retries.

---

### Requirement 5: Draft Persistence

**User Story:** As a job seeker, I want my in-progress form data to be automatically saved locally, so that I can close the app and resume where I left off without losing my work.

#### Acceptance Criteria

1. WHILE the user is on the form input tab, THE ResumeEngine SHALL debounce-save the current `formData`, `currentStep`, `phase`, `generatedResume`, and `pdfUri` to AsyncStorage within 500ms of any state change.
2. THE Draft SHALL be stored under the key `@resume_builder_draft_v1` and include a `version` field and `lastSaved` timestamp.
3. WHEN the ResumeBuilderScreen mounts and the form is on Step 1 with no `fullName` entered, THE ResumeEngine SHALL check AsyncStorage for a saved draft.
4. IF a draft exists, THEN THE ResumeBuilder SHALL display a modal asking the user to "Resume Draft" or "Start Fresh".
5. WHEN the user selects "Resume Draft", THE ResumeEngine SHALL dispatch `RESTORE_SESSION` with the saved draft data and dismiss the modal.
6. WHEN the user selects "Start Fresh", THE ResumeEngine SHALL delete the draft from AsyncStorage, dispatch `RESET_BUILDER`, and dismiss the modal.
7. THE ResumeEngine SHALL NOT save draft data when `phase` is `'exported'` or `inputTab` is `'history'`.

---

### Requirement 6: Resume Preview

**User Story:** As a job seeker, I want to see a formatted preview of my AI-generated resume before exporting it, so that I can review the content and decide whether to export or regenerate.

#### Acceptance Criteria

1. WHEN `phase` transitions to `'preview'`, THE ResumeBuilder SHALL render the `ResumePreview` component with the `formData` and `generatedResume`.
2. THE ResumePreview SHALL display: the candidate's name, contact details, professional summary, enhanced work experiences with bullet points, core skills, and ATS keywords.
3. THE ResumePreview SHALL provide an "Export PDF" button and a "Share" button.
4. WHEN the user is viewing a history item (not a freshly generated resume), THE ResumePreview SHALL display a "Back to History" button instead of the standard navigation.
5. WHILE a PDF export is in progress, THE ResumePreview SHALL disable the "Export PDF" button and show a loading indicator.

---

### Requirement 7: PDF Export and Sharing

**User Story:** As a job seeker, I want to export my resume as a PDF and share it, so that I can send it to employers directly from my phone.

#### Acceptance Criteria

1. WHEN the user taps "Export PDF", THE ResumeEngine SHALL generate an HTML representation of the resume via `generateResumeHTML()` and convert it to a PDF file using `expo-print`.
2. THE generated PDF SHALL be styled consistently with the resume preview, including the candidate's name, contact info, summary, experiences, skills, and ATS keywords.
3. WHEN PDF generation succeeds, THE ResumeEngine SHALL attempt to save the resume record to the Supabase `resume_builds` table with all `GeneratedResume` fields and the PDF URI.
4. IF the Supabase save fails, THE ResumeEngine SHALL NOT block the user from accessing their PDF — the export SHALL still be considered successful.
5. WHEN export succeeds, THE ResumeEngine SHALL dispatch `EXPORT_SUCCESS` with the PDF URI and transition `phase` to `'exported'`.
6. THE ResumeBuilder SHALL display a success screen when `phase` is `'exported'`, with "Share Resume" and "Build Another" actions.
7. WHEN the user taps "Share Resume", THE ResumeEngine SHALL invoke `expo-sharing` with the PDF URI and MIME type `application/pdf`.
8. THE ResumeEngine SHALL use a ref (`isExportingRef`) to prevent concurrent duplicate export calls.

---

### Requirement 8: Resume History

**User Story:** As a job seeker, I want to view and manage my previously generated resumes, so that I can re-access, re-export, or delete past resumes without regenerating them.

#### Acceptance Criteria

1. WHEN the user switches to the "History" tab, THE ResumeEngine SHALL fetch the user's resume history from the Supabase `resume_builds` table, ordered by `created_at` descending.
2. THE ResumeEngine SHALL fetch up to 20 history items per page and support loading additional pages via `loadMoreHistory()`.
3. WHEN the user selects a history item, THE ResumeEngine SHALL dispatch `LOAD_HISTORY_ITEM`, populate `generatedResume` from the stored data, and transition `phase` to `'preview'`.
4. WHEN the user taps "Delete" on a history item, THE ResumeBuilder SHALL display a confirmation alert before deleting.
5. WHEN the user confirms deletion, THE ResumeEngine SHALL delete the record from Supabase and dispatch `HISTORY_DELETE_SUCCESS` to remove it from local state.
6. IF the device has no internet connection when fetching history, THE ResumeEngine SHALL dispatch `HISTORY_FETCH_SUCCESS` with an empty array and SHALL NOT show an error.
7. THE ResumeHistoryList SHALL display a loading skeleton when history is being fetched for the first time.
8. THE ResumeHistoryList SHALL display an empty state with a "Build New Resume" call-to-action when no history items exist.

---

### Requirement 9: State Machine and Phase Transitions

**User Story:** As a developer, I want the ResumeBuilder to follow a strict, predictable state machine, so that the UI always reflects a valid application state and invalid transitions are silently ignored.

#### Acceptance Criteria

1. THE ResumeReducer SHALL define valid phase transitions: `input → [loading, preview, input]`, `loading → [preview, input, loading]`, `preview → [exported, input, preview, loading]`, `exported → [input, exported, preview]`.
2. IF a `SET_PHASE` action requests a transition not in the valid set for the current phase, THEN THE ResumeReducer SHALL return the current state unchanged.
3. THE `asyncStatus` field SHALL independently track async operation state (`idle`, `loading`, `success`, `error`) and SHALL NOT be conflated with `phase`.
4. WHEN `RESET_BUILDER` is dispatched, THE ResumeReducer SHALL reset `phase`, `currentStep`, `inputTab`, `formData`, `generatedResume`, `pdfUri`, `selectedResume`, `asyncStatus`, and `error` to their initial values, while preserving `resumeHistory`.
5. WHEN `RESET_ALL` is dispatched, THE ResumeReducer SHALL reset all state to `INITIAL_RESUME_STATE` while preserving `resumeHistory`.
6. FOR ALL sequences of valid `ResumeEngineAction` dispatches, THE ResumeReducer SHALL produce a state where `phase` is always one of `['input', 'loading', 'preview', 'exported']`.

---

### Requirement 10: Hardware Back Button and Navigation

**User Story:** As a mobile user, I want the Android hardware back button to behave intuitively within the ResumeBuilder, so that I can navigate backwards through the flow without accidentally exiting the screen.

#### Acceptance Criteria

1. WHEN the user presses the hardware back button while `phase` is `'preview'` or `'exported'`, THE ResumeBuilder SHALL transition `phase` back to `'input'` and SHALL NOT navigate away from the screen.
2. WHEN the user presses the hardware back button while `asyncStatus` is `'error'`, THE ResumeBuilder SHALL dispatch `RESET_BUILDER` and SHALL NOT navigate away from the screen.
3. WHEN the user presses the hardware back button while on Step 1 of the form, THE ResumeBuilder SHALL navigate back to the previous screen in the navigation stack.
4. WHEN the user presses the hardware back button while on Steps 2–5 of the form, THE ResumeBuilder SHALL navigate back to the previous step and SHALL NOT exit the screen.

---

### Requirement 11: Loading State and Animations

**User Story:** As a job seeker, I want to see an engaging loading screen while my resume is being generated, so that I understand the app is working and feel confident the process is progressing.

#### Acceptance Criteria

1. WHEN `phase` is `'loading'` and `asyncStatus` is `'loading'`, THE ResumeBuilder SHALL display a full-screen loading view with an animated icon, a title, and a rotating loading message.
2. THE loading icon SHALL animate with a pulsing scale (1.0 → 1.2 → 1.0) and opacity (0.3 → 0.8 → 0.3) cycle using `react-native-reanimated`.
3. THE loading message SHALL cycle through the `LOADING_MESSAGES` array every 1500ms.
4. THE loading message indicator SHALL display 3 dots, with the active dot highlighted based on the current `loadingMessage` index modulo 3.
5. WHEN `asyncStatus` transitions away from `'loading'`, THE ResumeBuilder SHALL stop all loading animations.

---

### Requirement 12: Accessibility and UX Polish

**User Story:** As a job seeker, I want the ResumeBuilder to be easy to use on a mobile device, so that I can complete the form and generate my resume without friction.

#### Acceptance Criteria

1. THE ResumeBuilder SHALL use `KeyboardAvoidingView` with `behavior: 'padding'` on iOS and `behavior: 'height'` on Android to prevent the keyboard from obscuring form inputs.
2. THE ResumeBuilder SHALL apply bottom padding equal to `Math.max(insets.bottom, 48)` on Android and `insets.bottom` on iOS to account for system navigation bars.
3. THE StepIndicator component SHALL visually display the current step number and total steps, and SHALL update in real time as the user navigates between steps.
4. THE "Next" button SHALL be visually disabled (reduced opacity) when `canProceed()` returns false.
5. THE ResumeBuilder SHALL display an informational note on Step 3 when `experienceLevel` is "Fresher", suggesting internships, college projects, or part-time work as alternatives.
6. WHEN the user taps "Add Another Role" on Step 3, THE ResumeBuilder SHALL add a new empty `WorkExperience` entry, up to a maximum of 4 entries.
7. THE "Add Another Role" button SHALL be hidden when the user already has 4 experience entries.
