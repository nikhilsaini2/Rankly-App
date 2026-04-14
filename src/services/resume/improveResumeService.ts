import { generateGeminiTextWithRetry, parseGeminiJson } from '../../services/gemini';
import type { AtsScoreRow } from '../../types/common.types';
import type { GeneratedResume } from '../../feature/resume/types/resume.types';
import { sanitizeGeneratedResume } from '../../feature/resume/utils/resumeSanitizer';

export interface ImproveResumeInput {
  resumeText: string;
  atsReport: AtsScoreRow;
  /** Optional metadata from the resume row */
  meta?: {
    title?: string | null;
    fileName?: string | null;
  };
}

/**
 * Builds the ATS-improvement prompt.
 * Merges original resume content with ATS findings to produce
 * an elite, keyword-optimized resume JSON.
 */
function buildImprovePrompt(input: ImproveResumeInput): string {
  const { resumeText, atsReport } = input;

  const missing = (atsReport.keywordsMissing ?? []).slice(0, 12).join(', ') || 'None identified';
  const found = (atsReport.keywordsFound ?? []).slice(0, 10).join(', ') || 'None identified';
  const improvements = (atsReport.feedback?.improvements ?? [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n') || 'None';
  const strengths = (atsReport.feedback?.strengths ?? [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n') || 'None';
  const aiSummary = atsReport.aiSummary ?? '';

  return `You are an elite ATS resume optimization engine trained on FAANG hiring standards.
Your task: take a real resume + its ATS analysis report and produce an OPTIMIZED resume JSON.

━━━ ORIGINAL RESUME CONTENT ━━━
${resumeText.slice(0, 3000)}

━━━ ATS ANALYSIS REPORT ━━━
Overall Score: ${atsReport.overallScore}/100
Keyword Score: ${atsReport.keywordScore ?? 'N/A'}/100
Content Score: ${atsReport.contentScore ?? 'N/A'}/100
Format Score: ${atsReport.formatScore ?? 'N/A'}/100

Keywords FOUND (preserve these): ${found}
Keywords MISSING (MUST inject naturally): ${missing}

AI Identified Improvements (MUST resolve ALL):
${improvements}

Strengths to PRESERVE:
${strengths}

AI Summary: ${aiSummary}

━━━ OPTIMIZATION RULES ━━━

[MANDATORY FIXES]
- Inject ALL missing keywords naturally into summary and bullets
- Resolve EVERY improvement point listed above
- Preserve ALL strengths — do not remove valid content
- Do NOT change job titles, company names, or education facts
- Do NOT invent achievements not implied by the original resume

[BULLET FORMULA — STRICT]
- Exactly 4 bullets per role
- Each bullet max 20 words
- Formula: [Elite Verb] + [what] + [how] + [metric]
- Elite verbs: Architected, Engineered, Optimized, Scaled, Led, Designed, Automated, Reduced, Launched, Drove, Streamlined, Delivered, Spearheaded, Implemented, Migrated
- Upgrade weak bullets to elite standard — never output the weak version
- Realistic metrics only: "35–40%", "2x", "~$200K ARR", "<100ms p99"
- FORBIDDEN: "responsible for", "worked on", "helped", "assisted"

[SUMMARY]
- 3 sentences max, 60 words max
- Open with role identity + years
- Include 1–2 quantified highlights
- Embed missing keywords naturally

[SKILLS]
- Flat string array, 10–12 items max
- Include ALL missing keywords that are skills
- Every skill must appear in bullets or summary

[ATS KEYWORDS]
- Exactly 8 strings
- Must include the top missing keywords
- Every keyword must appear in content

[CONTACT / EDUCATION]
- Extract name, email, phone, city, linkedin from resume text if present
- Preserve degree, institution, graduation year exactly as stated

[OUTPUT FAILURE PREVENTION]
- Never output placeholder text, "N/A", or "[infer...]" in JSON values
- If a section would be weak → rewrite internally before returning

Return ONLY valid JSON. No markdown. No backticks. No explanation.

{
  "contact": {
    "fullName": "<extracted from resume>",
    "email": "<extracted or empty string>",
    "phone": "<extracted or empty string>",
    "city": "<extracted or empty string>",
    "linkedin": "<extracted or empty string>",
    "targetRole": "<inferred from resume content>"
  },
  "professionalSummary": "<3 sentences, quantified, ATS-rich, max 60 words>",
  "enhancedExperiences": [
    {
      "jobTitle": "<exact from resume>",
      "company": "<exact from resume>",
      "duration": "<exact from resume>",
      "bulletPoints": [
        "<Elite Verb + what + how + metric — max 20 words>",
        "<Elite Verb + what + how + metric — max 20 words>",
        "<Elite Verb + what + how + metric — max 20 words>",
        "<Elite Verb + what + how + metric — max 20 words>"
      ]
    }
  ],
  "education": {
    "degree": "<exact from resume>",
    "institution": "<exact from resume>",
    "graduationYear": "<exact from resume>",
    "grade": "<exact from resume or empty string>"
  },
  "coreSkills": ["skill1", "skill2", "...up to 12, flat strings only"],
  "atsKeywords": ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8"]
}`;
}

export interface ImprovedResumeResult {
  generatedResume: GeneratedResume;
  contact: {
    fullName: string;
    email: string;
    phone: string;
    city: string;
    linkedin: string;
    targetRole: string;
  };
  education: {
    degree: string;
    institution: string;
    graduationYear: string;
    grade: string;
  };
}

/**
 * Calls Gemini to produce an ATS-optimized resume from the original text + ATS report.
 * Returns a structured result ready for HTML generation and PDF export.
 */
export async function generateImprovedResume(
  input: ImproveResumeInput,
): Promise<ImprovedResumeResult> {
  const prompt = buildImprovePrompt(input);
  const raw = await generateGeminiTextWithRetry(prompt, 1, 10000);

  const parsed = parseGeminiJson<any>(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI returned an invalid response. Please try again.');
  }

  // Extract and normalize contact
  const contact = {
    fullName: String(parsed.contact?.fullName ?? ''),
    email: String(parsed.contact?.email ?? ''),
    phone: String(parsed.contact?.phone ?? ''),
    city: String(parsed.contact?.city ?? ''),
    linkedin: String(parsed.contact?.linkedin ?? ''),
    targetRole: String(parsed.contact?.targetRole ?? ''),
  };

  // Extract and normalize education
  const education = {
    degree: String(parsed.education?.degree ?? ''),
    institution: String(parsed.education?.institution ?? ''),
    graduationYear: String(parsed.education?.graduationYear ?? ''),
    grade: String(parsed.education?.grade ?? ''),
  };

  // Build GeneratedResume shape and sanitize
  const rawResume: GeneratedResume = {
    professionalSummary: String(parsed.professionalSummary ?? ''),
    enhancedExperiences: Array.isArray(parsed.enhancedExperiences)
      ? parsed.enhancedExperiences
      : [],
    coreSkills: Array.isArray(parsed.coreSkills) ? parsed.coreSkills : [],
    atsKeywords: Array.isArray(parsed.atsKeywords) ? parsed.atsKeywords : [],
  };

  const generatedResume = sanitizeGeneratedResume(rawResume);

  return { generatedResume, contact, education };
}
