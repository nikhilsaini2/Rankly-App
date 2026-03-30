import type { ExperienceLevel } from '../types/common.types';

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
];

export const DIFFICULTY_OPTIONS: { value: 'easy' | 'medium' | 'hard'; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export const SESSION_TYPES: { value: 'behavioral' | 'technical' | 'mixed'; label: string }[] = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'mixed', label: 'Mixed' },
];

export const QUESTION_COUNTS = [3, 5, 10] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];

export const MAX_FREE_RESUMES = 3;
