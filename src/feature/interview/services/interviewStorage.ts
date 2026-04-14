import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Answer, SessionConfig } from '../types/interview.types';

const HISTORY_KEY = 'rankly_interview_history_v1';
const MAX_HISTORY = 20;

// ─── Data model ───────────────────────────────────────────────────────────────

export interface InterviewReport {
  id: string;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sessionType: 'behavioral' | 'technical' | 'mixed';
  questionsCount: number;
  answers: Answer[];
  averageScore: number;
  createdAt: number; // Unix ms
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `ir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<InterviewReport[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as InterviewReport[];
  } catch {
    return [];
  }
}

async function writeAll(reports: InterviewReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('[InterviewStorage] Failed to write history', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves a completed interview session to history.
 * Enforces MAX_HISTORY limit by removing the oldest entry.
 * Only saves if the session has at least one answered question.
 */
export async function saveInterview(
  config: SessionConfig,
  answers: Answer[],
): Promise<InterviewReport | null> {
  if (!answers.length) return null;

  const averageScore =
    answers.length > 0
      ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length)
      : 0;

  const report: InterviewReport = {
    id: generateId(),
    role: config.role,
    difficulty: config.difficulty,
    sessionType: config.sessionType,
    questionsCount: answers.length,
    answers,
    averageScore,
    createdAt: Date.now(),
  };

  const existing = await readAll();

  // Prepend new report, enforce limit
  const updated = [report, ...existing].slice(0, MAX_HISTORY);
  await writeAll(updated);

  return report;
}

/**
 * Returns all saved interviews sorted by createdAt DESC.
 */
export async function getAllInterviews(): Promise<InterviewReport[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Returns a single interview by ID, or null if not found.
 */
export async function getInterviewById(id: string): Promise<InterviewReport | null> {
  const all = await readAll();
  return all.find(r => r.id === id) ?? null;
}

/**
 * Deletes a single interview by ID.
 */
export async function deleteInterview(id: string): Promise<void> {
  const all = await readAll();
  const filtered = all.filter(r => r.id !== id);
  await writeAll(filtered);
}
