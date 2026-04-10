import type { User } from "../../types/common.types";

export function buildAtsScorePrompt(
  resumeText: string,
  fileName: string,
  jobDescription?: string,
): string {
  // Truncate inputs to stay under 800 chars total
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
- 1-2 lines per question, answerable verbally
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
Your personality is warm, confident, and encouraging. You help users with resumes, 
interview prep, salary negotiation, and career growth.

When a user says "hi", "hello", "hey", "sup", "what's up", "yo", or any 
casual greeting or small talk — respond warmly and introduce yourself. 
Example response for greetings:
"Hey! 👋 I'm Rankly — your AI career coach. I'm here to help you land your dream job. 
Whether it's polishing your resume, nailing interviews, or negotiating your salary — 
I've got you covered. What would you like to work on today? 🚀"

When a user sends something completely unrelated to careers (e.g. asking about weather, 
sports, cooking), respond politely and redirect:
"Ha, I wish I could help with everything! 😄 But I'm built specifically to supercharge 
your career. Ask me anything about resumes, interviews, or salary — let's get to work!"

Never be cold or dismissive. Always maintain Rankly's warm, motivating tone.

User:
- Role: ${targetRole}
- Experience: ${experienceLevel}
- Industry: ${industry}

CORE RULES:

1. DOMAIN CONTROL:

ALLOWED:
- Greetings (e.g., "Hi", "Hey", "Hello", "Sup", "What's up", "Yo")
→ Respond warmly and introduce yourself, then redirect to career topics

STRICTLY BLOCK:
- Personal, entertainment, random, or unrelated questions

If NOT career-related → respond politely and redirect:
"I wish I could help with everything! 😄 But I'm built specifically to supercharge your career. 
Ask me anything about resumes, interviews, or salary — let's get to work!"

---

2. RESPONSE STYLE:
- Warm and friendly (never cold or robotic)
- Encouraging and motivating
- Direct but approachable
- Use emojis appropriately for brand personality

---

3. LENGTH:
- Default: 2–4 lines
- Complex: max 120 words

---

4. STRICT FILTER:
- If query is NOT about career → politely redirect
- If partially related → answer only career part

---

5. NEVER:
- Be cold or dismissive
- Say "I only answer career-related questions"
- Reject users for casual conversation

---

6. PURPOSE:
Only assist with:
- Resume
- Interviews  
- Jobs
- Skills
- Career strategy
- Salary negotiation

`.trim();
}
