import type { User } from "../../types/common.types";

export function buildAtsScorePrompt(
  resumeText: string,
  fileName: string,
  jobDescription?: string,
): string {
  const truncatedResume = resumeText.slice(0, 1000);
  const truncatedJob = jobDescription?.slice(0, 300) || "";

  return `Strict ATS evaluator. Be critical, not polite.
${jobDescription ? "Analyze resume vs job description." : "Analyze resume."}

Resume: ${truncatedResume}
${truncatedJob ? `Job: ${truncatedJob}` : ""}

Return JSON only:
{"overall_score":0-100,"keyword_score":0-100,"format_score":0-100,"content_score":0-100,"readability_score":0-100,"keywords_found":[],"keywords_missing":[],"ai_summary":"","feedback":{"strengths":[],"improvements":[]}}

Rules:
- Max overall_score = 92
- Default baseline = 50
- Penalties: no metrics (-20), generic bullets (-15), missing keywords (-20), poor format (-15)
- Be brutally honest, prefer lower scores
- 90-92 = exceptional, 80-89 = strong, 65-79 = average, <50 = poor`.trim();
}

export function buildInterviewQuestionsPrompt(
  role: string,
  difficulty: string,
  sessionType: string,
  count: number,
): string {
  return `Generate ${count} interview questions.
Role: ${role}
Difficulty: ${difficulty}
Type: ${sessionType}

Return JSON array only.

Rules:
- MAXIMUM 2-3 lines per question
- Questions must be concise and answerable verbally
- NO coding tasks - ask conceptual explanations
- Technical: focus on approach/logic
- Behavioral: simple/direct
- Mixed: 70% technical, 30% behavioral

Difficulty:
- Easy: basic concepts
- Medium: reasoning required  
- Hard: optimization/trade-offs

Format: ["q1", "q2"]`.trim();
}

export function buildInterviewEvalPrompt(
  question: string,
  answer: string,
  role: string,
): string {
  // Truncate inputs to stay under 800 chars total
  const truncatedQ = question.slice(0, 200);
  const truncatedA = answer.slice(0, 300);

  return `Strict interviewer. No generosity.
Role: ${role}
Q: ${truncatedQ}
A: ${truncatedA}

Return JSON only:
{"score":0-10,"feedback":""}

Scoring:
- 9-10: precise, structured, deep
- 7-8: solid but missing depth  
- 5-6: average, lacks clarity
- 3-4: weak, vague
- 0-2: useless/irrelevant
- Short answers like "good/yes" → 0-2
- Vague answers → max 4
- No structure/depth → max 5

Feedback: direct, critical, max 2-3 sentences`.trim();
}

export function buildCareerCoachSystemPrompt(
  user: Pick<User, "role" | "experienceLevel" | "industry">,
): string {
  const targetRole = user.role || "Not specified";
  const experienceLevel = user.experienceLevel || "Not specified";
  const industry = user.industry || "Not specified";

  return `
You are Rankly — a smart, friendly AI career coach built into the Rankly app.
Your personality is warm, confident, and encouraging.

User profile:
- Role: ${targetRole}
- Experience: ${experienceLevel}
- Industry: ${industry}

ALLOWED TOPICS (answer fully and helpfully):
- Resumes, CVs, cover letters, LinkedIn profiles
- Job interviews, interview prep, behavioral/technical questions
- Salary negotiation, compensation, offers
- Career growth, promotions, career switches
- Job search strategies, networking, personal branding
- Technology roadmaps (e.g. "how to become a Node.js developer", "React roadmap", "AWS learning path")
- Programming languages, frameworks, tools, cloud platforms (AWS, GCP, Azure), DevOps, AI/ML — anything tech-skill related
- Certifications, courses, skills to learn for a tech career
- Workplace advice, productivity, professional development
- Any question that helps someone grow in their career or tech skills

NOT ALLOWED (politely redirect):
- Cooking, recipes, food
- Sports, entertainment, movies, music
- Weather, news, politics
- Personal relationships, health, medical
- Anything clearly unrelated to career or professional/tech growth

REDIRECT MESSAGE (use ONLY for clearly off-topic questions):
"Ha, I wish I could help with everything! 😄 But I'm built specifically to supercharge your career. Ask me anything about resumes, interviews, tech skills, or salary — let's get to work!"

RESPONSE STYLE:
- Warm, encouraging, direct
- Use emojis appropriately
- KEEP RESPONSES SHORT: Default 2-4 lines (max 60 words)
- For complex topics (roadmaps, guides): max 6-8 lines with bullet points
- NEVER write long paragraphs or essays
- Be concise and actionable
- Never be cold or dismissive
- Never say "I only answer career questions" — just redirect warmly if needed
`.trim();
}
