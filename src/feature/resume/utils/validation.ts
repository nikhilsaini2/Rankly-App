import * as Yup from 'yup';

/**
 * Per-step field validation — returns a map of fieldName → error message.
 * Returns an empty object if all fields for that step are valid.
 */
export function validateStep(step: number, formData: any): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (step) {
    case 1: {
      if (!formData.fullName?.trim()) errors.fullName = 'Full name is required';
      if (!formData.email?.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errors.email = 'Enter a valid email address';
      }
      if (formData.linkedin?.trim() && !/^https?:\/\/.+/.test(formData.linkedin.trim())) {
        errors.linkedin = 'LinkedIn URL must start with http:// or https://';
      }
      break;
    }
    case 2: {
      if (!formData.targetRole?.trim()) errors.targetRole = 'Target job title is required';
      if (!formData.experienceLevel) errors.experienceLevel = 'Select an experience level';
      if (!formData.industry) errors.industry = 'Select an industry';
      if (!formData.skills?.trim()) errors.skills = 'List at least one skill';
      break;
    }
    case 3: {
      if (formData.experienceLevel !== 'Fresher') {
        (formData.experiences ?? []).forEach((exp: any, i: number) => {
          if (!exp?.jobTitle?.trim()) errors[`experiences[${i}].jobTitle`] = 'Job title is required';
          if (!exp?.company?.trim()) errors[`experiences[${i}].company`] = 'Company name is required';
          if (!exp?.duration?.trim()) errors[`experiences[${i}].duration`] = 'Duration is required';
        });
      }
      break;
    }
    case 4: {
      if (!formData.degree?.trim()) errors.degree = 'Degree / qualification is required';
      if (!formData.institution?.trim()) errors.institution = 'Institution name is required';
      if (!formData.graduationYear?.trim()) errors.graduationYear = 'Year of completion is required';
      break;
    }
    case 5: {
      if (!formData.tone) errors.tone = 'Select a resume tone';
      break;
    }
  }

  return errors;
}

/**
 * Full-form validation used just before AI generation.
 * Returns a flat list of human-readable error messages, or empty array if valid.
 */
export function validateFullForm(formData: any): string[] {
  const messages: string[] = [];

  for (let step = 1; step <= 5; step++) {
    const stepErrors = validateStep(step, formData);
    messages.push(...Object.values(stepErrors));
  }

  return messages;
}

/**
 * Validation schema for Gemini response structure
 */
export const GeminiResumeSchema = Yup.object().shape({
  professionalSummary: Yup.string().required(),
  enhancedExperiences: Yup.array().of(
    Yup.object().shape({
      jobTitle: Yup.string().required(),
      company: Yup.string().required(),
      duration: Yup.string().required(),
      bulletPoints: Yup.array().of(Yup.string()).required(),
    })
  ).required(),
  // projects, achievements, inferredCertifications are optional
  projects: Yup.array().optional(),
  achievements: Yup.array().optional(),
  inferredCertifications: Yup.array().optional(),
  coreSkills: Yup.array().of(Yup.string()).required(),
  atsKeywords: Yup.array().of(Yup.string()).required(),
});
