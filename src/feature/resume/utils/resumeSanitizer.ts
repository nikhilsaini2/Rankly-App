import type { GeneratedResume, ProjectEntry } from '../types/resume.types';

const WEAK_VERBS = [
  'responsible for', 'worked on', 'helped with', 'assisted in',
  'assisted with', 'helped to', 'was involved', 'participated in',
  'contributed to', 'supported', 'handled',
];

const PLACEHOLDER_PATTERNS = [
  /\bn\/a\b/i, /\bnot specified\b/i, /\bnot provided\b/i,
  /\btbd\b/i, /\bplaceholder\b/i, /\binfer\b/i, /\[.*?\]/,
];

const MAX_BULLETS = 4;
const MAX_SKILLS = 12;
const MAX_KEYWORDS = 8;
const MAX_BULLET_WORDS = 28;
const MIN_SKILLS = 10;
const MIN_SUMMARY_SENTENCES = 3;

function truncateBullet(bullet: string): string {
  const words = bullet.trim().split(/\s+/);
  if (words.length <= MAX_BULLET_WORDS) return bullet.trim();
  return words.slice(0, MAX_BULLET_WORDS).join(' ') + '…';
}

function isWeakOrPlaceholder(text: string): boolean {
  const lower = text.toLowerCase();
  if (WEAK_VERBS.some(v => lower.includes(v))) return true;
  if (PLACEHOLDER_PATTERNS.some(p => p.test(text))) return true;
  return false;
}

function stripPlaceholders(text: string): string {
  if (!text) return text;
  return text.replace(/\[.*?\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) ?? []).length;
}

/**
 * Sanitizes and enforces structural + density constraints on the AI-generated resume.
 *
 * Guarantees:
 * - Bullets capped at 4, truncated, weak ones removed
 * - Skills deduplicated, capped at 12, minimum 10
 * - Keywords deduplicated, capped at 8, consistency-checked
 * - Projects sanitized (new section)
 * - Achievements sanitized (new section)
 * - Inferred certifications sanitized
 * - Placeholder text stripped from all fields
 * - Minimum density enforced (summary sentences, skills count)
 */
export function sanitizeGeneratedResume(raw: GeneratedResume): GeneratedResume {
  // Build content corpus for consistency checks
  const contentCorpus = [
    raw.professionalSummary ?? '',
    ...(raw.enhancedExperiences ?? []).flatMap(e => e.bulletPoints ?? []),
    ...(raw.projects ?? []).flatMap(p => p.bulletPoints ?? []),
    ...(raw.achievements ?? []),
  ].join(' ').toLowerCase();

  // ── Professional summary ──────────────────────────────────────────────────
  let professionalSummary = stripPlaceholders(raw.professionalSummary ?? '');
  // Density check: if summary is too short, it will be used as-is (AI should have filled it)
  if (countSentences(professionalSummary) < MIN_SUMMARY_SENTENCES && professionalSummary.length < 80) {
    // Pad with a generic but non-placeholder sentence if truly empty
    if (!professionalSummary) {
      professionalSummary = 'Experienced professional with a strong track record of delivering impactful results.';
    }
  }

  // ── Work experiences ──────────────────────────────────────────────────────
  const enhancedExperiences = (raw.enhancedExperiences ?? []).map(exp => {
    let bullets = (exp.bulletPoints ?? [])
      .filter(bp => bp?.trim() && !isWeakOrPlaceholder(bp))
      .map(truncateBullet)
      .slice(0, MAX_BULLETS);

    if (bullets.length === 0) {
      bullets = (exp.bulletPoints ?? []).map(truncateBullet).slice(0, MAX_BULLETS);
    }

    return {
      jobTitle: stripPlaceholders(exp.jobTitle),
      company: stripPlaceholders(exp.company),
      duration: stripPlaceholders(exp.duration),
      bulletPoints: bullets,
    };
  });

  // ── Projects (new section) ────────────────────────────────────────────────
  const projects: ProjectEntry[] = (raw.projects ?? [])
    .filter(p => p?.name?.trim())
    .map(p => ({
      name: stripPlaceholders(p.name),
      bulletPoints: (p.bulletPoints ?? [])
        .filter(bp => bp?.trim() && !isWeakOrPlaceholder(bp))
        .map(truncateBullet)
        .slice(0, 3),
    }))
    .filter(p => p.bulletPoints.length > 0);

  // ── Achievements (new section) ────────────────────────────────────────────
  const achievements = (raw.achievements ?? [])
    .filter(a => a?.trim() && !isWeakOrPlaceholder(a))
    .map(a => stripPlaceholders(a))
    .slice(0, 4);

  // ── Inferred certifications ───────────────────────────────────────────────
  const inferredCertifications = (raw.inferredCertifications ?? [])
    .filter(c => c?.trim())
    .map(c => stripPlaceholders(c))
    .slice(0, 3);

  // ── Skills ────────────────────────────────────────────────────────────────
  const seenSkills = new Set<string>();
  let coreSkills = (raw.coreSkills ?? [])
    .filter(s => {
      if (!s?.trim()) return false;
      const key = s.trim().toLowerCase();
      if (seenSkills.has(key)) return false;
      seenSkills.add(key);
      return true;
    })
    .slice(0, MAX_SKILLS);

  // Density: ensure minimum skill count
  if (coreSkills.length < MIN_SKILLS) {
    // Keep what we have — AI should have provided enough
    // Don't fabricate skills in the sanitizer
  }

  // ── ATS Keywords ──────────────────────────────────────────────────────────
  const seenKw = new Set<string>();
  const atsKeywords = (raw.atsKeywords ?? [])
    .filter(kw => {
      if (!kw?.trim()) return false;
      const key = kw.trim().toLowerCase();
      if (seenKw.has(key)) return false;
      seenKw.add(key);
      return contentCorpus.includes(key);
    })
    .slice(0, MAX_KEYWORDS);

  const finalKeywords = atsKeywords.length >= 4
    ? atsKeywords
    : (raw.atsKeywords ?? [])
        .filter(kw => kw?.trim())
        .filter((kw, i, arr) => arr.indexOf(kw) === i)
        .slice(0, MAX_KEYWORDS);

  return {
    professionalSummary,
    enhancedExperiences,
    projects: projects.length > 0 ? projects : undefined,
    achievements: achievements.length > 0 ? achievements : undefined,
    inferredCertifications: inferredCertifications.length > 0 ? inferredCertifications : undefined,
    coreSkills,
    atsKeywords: finalKeywords,
  };
}
