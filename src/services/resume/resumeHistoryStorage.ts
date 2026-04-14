import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GeneratedResume, ResumeFormData } from '../../feature/resume/types/resume.types';

const HISTORY_KEY = 'rankly_resume_history_v1';
const MAX_HISTORY = 20;

// ─── Data model ───────────────────────────────────────────────────────────────

export interface ResumeHistoryEntry {
  id: string;
  title: string;
  html: string;
  rawData: GeneratedResume;
  /** Partial formData stored so the preview header renders correctly */
  formData?: Partial<ResumeFormData>;
  meta: {
    role: string;
    experienceLevel: string;
    /** "builder" = AI Resume Builder | "ats-improve" = ATS → Improve with AI */
    source: 'builder' | 'ats-improve';
  };
  createdAt: number; // Unix ms
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `rh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<ResumeHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Back-compat: entries without source default to "builder"
    return (parsed as ResumeHistoryEntry[]).map(e => ({
      ...e,
      meta: { ...e.meta, source: e.meta?.source ?? 'builder' },
    }));
  } catch {
    return [];
  }
}

async function writeAll(entries: ResumeHistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('[ResumeHistoryStorage] Failed to write history', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves a resume to unified history.
 * Works for both builder and ats-improve flows.
 * Does NOT save if html is empty.
 * Enforces MAX_HISTORY limit by removing the oldest entry.
 */
export async function saveResume(params: {
  html: string;
  rawData: GeneratedResume;
  role: string;
  fullName: string;
  experienceLevel: string;
  source?: 'builder' | 'ats-improve';
  formData?: Partial<ResumeFormData>;
}): Promise<ResumeHistoryEntry | null> {
  if (!params.html?.trim()) return null;

  const title = params.role
    ? `${params.role} Resume`
    : params.fullName
    ? params.fullName
    : 'My Resume';

  const entry: ResumeHistoryEntry = {
    id: generateId(),
    title,
    html: params.html,
    rawData: params.rawData,
    formData: params.formData,
    meta: {
      role: params.role,
      experienceLevel: params.experienceLevel,
      source: params.source ?? 'builder',
    },
    createdAt: Date.now(),
  };

  const existing = await readAll();
  const deduped = existing.filter(e => e.id !== entry.id);
  const updated = [entry, ...deduped].slice(0, MAX_HISTORY);
  await writeAll(updated);

  return entry;
}

/**
 * Returns all saved resumes sorted by createdAt DESC.
 */
export async function getAllResumes(): Promise<ResumeHistoryEntry[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Returns a single resume by ID, or null if not found.
 */
export async function getResumeById(id: string): Promise<ResumeHistoryEntry | null> {
  const all = await readAll();
  return all.find(e => e.id === id) ?? null;
}

/**
 * Deletes a single resume by ID.
 */
export async function deleteResume(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter(e => e.id !== id));
}
