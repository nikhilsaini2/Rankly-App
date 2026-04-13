import type { ResumeFormData } from '../types/resume.types'

export const buildResumePrompt = (formData: ResumeFormData): string => {
  return `You are an expert resume writer and ATS optimization specialist.
Build a complete, professional resume for this candidate.

CANDIDATE PROFILE:
Name: ${formData.fullName}
Target Role: ${formData.targetRole}
Experience Level: ${formData.experienceLevel}
Industry: ${formData.industry}
Skills: ${formData.skills}
Location: ${formData.city || "Not specified"}
Tone: ${formData.tone}
Target Companies: ${formData.targetCompanies || "Not specified"}
Top Achievement: ${formData.topAchievement || "Not specified"}
Special Instructions: ${formData.specialInstructions || "None"}

WORK EXPERIENCE:
${formData.experiences
  .map(
    (exp, i) => `
Role ${i + 1}:
- Title: ${exp.jobTitle}
- Company: ${exp.company}
- Duration: ${exp.duration}
- Achievement 1: ${exp.achievement1}
- Achievement 2: ${exp.achievement2}
`,
  )
  .join("\n")}

EDUCATION:
- Degree: ${formData.degree}
- Institution: ${formData.institution}
- Year: ${formData.graduationYear}
- Grade: ${formData.grade || "Not specified"}

CERTIFICATIONS: ${formData.certifications || "None"}
LANGUAGES: ${formData.languages || "Not specified"}

Generate a ${formData.tone.toLowerCase()} resume optimized for ATS and 
${formData.targetRole} roles in the ${formData.industry} industry.

Return ONLY a JSON object, NO markdown, NO backticks, NO preamble:
{
  "professionalSummary": "<3-4 sentences, ${formData.tone.toLowerCase()} tone, keyword-rich, quantified where possible>",
  "enhancedExperiences": [
    {
      "jobTitle": "<exact title>",
      "company": "<exact company>",
      "duration": "<exact duration>",
      "bulletPoints": [
        "<strong action verb + achievement + quantified result>",
        "<strong action verb + achievement + quantified result>",
        "<strong action verb + achievement + quantified result>"
      ]
    }
  ],
  "coreSkills": ["<skill1>", "<skill2>", ... up to 12 skills extracted and enhanced from their input],
  "atsKeywords": ["<keyword1>", "<keyword2>", ... 8 ATS keywords for ${formData.targetRole}]
}`
}
