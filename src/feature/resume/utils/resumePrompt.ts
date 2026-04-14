import type { ResumeFormData } from '../types/resume.types';

// ─── Experience-level directives ─────────────────────────────────────────────
const LEVEL_DIRECTIVE: Record<string, string> = {
  Fresher:
    'FRESHER: No work experience. Generate a "Projects" section (2–3 projects) ' +
    'instead of Work Experience. Each project: name, tech stack, 3 bullets. ' +
    'Bullets: Problem → Solution → Impact → Tech. Metrics: users, performance %, lines of code. ' +
    'Also generate an "Achievements" entry (academic rank, hackathon, certification impact). ' +
    'Infer 1–2 relevant certifications if none provided.',
  '1-2 yrs':
    'ENTRY-LEVEL (1–2 yrs): Show feature ownership, individual delivery, measurable impact. ' +
    'Generate a "Projects" section with 1–2 side projects or open-source contributions. ' +
    'Metrics: delivery speed, bug reduction, test coverage, user impact.',
  '3-5 yrs':
    'MID-LEVEL (3–5 yrs): Show full ownership, cross-team collaboration, system-level thinking. ' +
    'Metrics: performance gains, revenue impact, team size, scale. ' +
    'Include 1 notable project or achievement if space allows.',
  '6-10 yrs':
    'SENIOR (6–10 yrs): Show technical leadership, architecture decisions, mentorship, org-wide impact. ' +
    'Metrics: system scale, cost savings, team growth, business outcomes.',
  '10+ yrs':
    'LEAD/PRINCIPAL (10+ yrs): Show strategic vision, cross-org influence, hiring, platform decisions. ' +
    'Metrics: org headcount, revenue, platform scale, strategic initiatives.',
};

// ─── Content density thresholds ──────────────────────────────────────────────
function isLowExperience(level: string): boolean {
  return level === 'Fresher' || level === '1-2 yrs';
}

export const buildResumePrompt = (formData: ResumeFormData): string => {
  const level = formData.experienceLevel || '3-5 yrs';
  const industry = formData.industry || 'Technology';
  const role = formData.targetRole;
  const tone = formData.tone || 'Professional';
  const levelDirective = LEVEL_DIRECTIVE[level] ?? LEVEL_DIRECTIVE['3-5 yrs'];
  const lowExp = isLowExperience(level);

  const validExps = (formData.experiences ?? []).filter(e => e.jobTitle?.trim());

  const experienceBlock = validExps.length > 0
    ? validExps.map((exp, i) => {
        const a1 = exp.achievement1?.trim();
        const a2 = exp.achievement2?.trim();
        return `Role ${i + 1}:
  Title: ${exp.jobTitle}
  Company: ${exp.company?.trim() || '[infer plausible company for this role/industry]'}
  Duration: ${exp.duration?.trim() || '[infer realistic tenure, e.g. Jan 2022 – Dec 2023]'}
  Achievement 1: ${a1 || '[infer realistic quantified achievement for this role]'}
  Achievement 2: ${a2 || '[infer realistic quantified achievement for this role]'}`;
      }).join('\n\n')
    : lowExp
    ? '[No experience — generate Projects section per LEVEL DIRECTIVE]'
    : '[No experience — infer 1–2 realistic roles for this level/industry]';

  return `You are an elite resume architect. Your output is a FINISHED PRODUCT — a 1-page A4 resume that requires zero edits.

CANDIDATE:
Name: ${formData.fullName}
Role: ${role}
Level: ${level}
Industry: ${industry}
Skills: ${formData.skills?.trim() || '[infer top 12 skills for this role/industry]'}
Top Achievement: ${formData.topAchievement?.trim() || '[infer a strong career highlight]'}
Tone: ${tone}
Target Companies: ${formData.targetCompanies?.trim() || 'Top-tier product companies'}
Special Instructions: ${formData.specialInstructions?.trim() || 'None'}

EXPERIENCE INPUT:
${experienceBlock}

EDUCATION:
${formData.degree || '[infer degree]'} — ${formData.institution || '[infer institution]'} (${formData.graduationYear || '[infer year]'})${formData.grade ? `, ${formData.grade}` : ''}
Certifications: ${formData.certifications?.trim() || '[infer 1–2 realistic certifications for this role]'}
Languages: ${formData.languages?.trim() || 'English'}

LEVEL DIRECTIVE — FOLLOW EXACTLY:
${levelDirective}

━━━ GENERATION RULES ━━━

[SUMMARY — 4 sentences for low experience, 3 for senior]
- Open: "[Role] with [X] years in [industry]..."
- Include 1–2 quantified highlights
- Embed ATS keywords naturally — do NOT list them separately
- Tone: ${tone}

[WORK EXPERIENCE BULLETS]
- Exactly 4 bullets per role
- Each bullet max 22 words, must fit one PDF line
- Formula: [Elite Verb] + [what] + [how] + [metric]
- Elite verbs: Architected, Engineered, Optimized, Scaled, Led, Designed, Automated, Reduced, Launched, Drove, Streamlined, Delivered, Spearheaded, Implemented, Migrated
- Each bullet must contribute UNIQUE information — no redundancy across bullets
- Metrics: "35–40%", "2x", "~$200K ARR", "50K users", "<100ms p99"
- FORBIDDEN: "responsible for", "worked on", "helped", "assisted"
- Weak input → REWRITE to elite standard
- Missing → INFER realistic achievement within role/industry/level scope
- ANTI-HALLUCINATION: No "millions of users" or "Fortune 500" unless stated

[PROJECTS SECTION — MANDATORY for Fresher/1-2 yrs, OPTIONAL for others if space allows]
- Format: "Project Name | Tech Stack"
- 3 bullets per project: Problem → Solution → Impact
- Use format: "[Verb] [project] — [problem] using [tech], achieving [metric]"
- Projects MUST be in "projects" array — NEVER mixed into enhancedExperiences

[ACHIEVEMENTS — include if space allows]
- Awards, rankings, hackathons, certifications impact
- 1–3 items, each one line
- Format: "[Achievement] — [context/impact]"

[SKILLS]
- Flat array, 10–12 items, high-signal only
- Every skill must appear in bullets or summary
- Infer from role + industry if sparse

[ATS KEYWORDS — INVISIBLE]
- 8 role-specific keywords
- CRITICAL: These must be EMBEDDED in summary/bullets — NOT shown as a separate section
- Return them in the JSON for internal use only

[DENSITY RULES — CRITICAL FOR 1-PAGE A4]
- Low experience (Fresher/1-2 yrs): MUST include Projects + Achievements + Certifications to fill page
- Mid/Senior: 2–3 experience entries with 4 bullets each fills the page
- NEVER leave sections empty — infer content if needed
- Summary: 4 lines for low exp, 3 lines for senior
- Total content must fill ~90% of A4 page

[CERTIFICATIONS]
- If provided: clean format, one per line
- If not provided: infer 1–2 realistic certifications for this role/industry

[OUTPUT FAILURE PREVENTION]
- Never output placeholder text in JSON values
- Missing company → "[Role-appropriate company, e.g. Series B SaaS Startup]"
- Missing duration → infer realistic dates
- If any section is weak → rewrite internally before returning

Return ONLY valid JSON. No markdown. No backticks. No explanation.

{
  "professionalSummary": "<3–4 sentences, ${tone} tone, quantified, ATS keywords embedded naturally>",
  "enhancedExperiences": [
    {
      "jobTitle": "<title>",
      "company": "<company>",
      "duration": "<duration>",
      "bulletPoints": [
        "<Elite Verb + unique what + how + metric — max 22 words>",
        "<Elite Verb + unique what + how + metric — max 22 words>",
        "<Elite Verb + unique what + how + metric — max 22 words>",
        "<Elite Verb + unique what + how + metric — max 22 words>"
      ]
    }
  ],
  "projects": [
    {
      "name": "<Project Name | Tech Stack>",
      "bulletPoints": [
        "<Verb + project + problem + tech + metric>",
        "<Verb + project + problem + tech + metric>",
        "<Verb + project + problem + tech + metric>"
      ]
    }
  ],
  "achievements": ["<Achievement — context/impact>"],
  "inferredCertifications": ["<cert1>", "<cert2>"],
  "coreSkills": ["skill1", "skill2", "...up to 12, flat strings only"],
  "atsKeywords": ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8"]
}`;
};
