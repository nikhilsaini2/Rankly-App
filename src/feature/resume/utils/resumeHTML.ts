import type { GeneratedResume, ResumeFormData } from '../types/resume.types';

/**
 * Estimates content density to drive adaptive font/spacing.
 * Returns 'low' | 'medium' | 'high'
 */
function estimateDensity(form: ResumeFormData, resume: GeneratedResume): 'low' | 'medium' | 'high' {
  let score = 0;
  score += resume.enhancedExperiences.length * 3;
  score += (resume.projects?.length ?? 0) * 2;
  score += (resume.achievements?.length ?? 0);
  score += resume.professionalSummary.split(/\s+/).length > 50 ? 2 : 0;
  score += form.certifications ? 1 : 0;
  score += form.languages ? 1 : 0;
  if (score <= 5) return 'low';
  if (score >= 12) return 'high';
  return 'medium';
}

export const generateResumeHTML = (
  form: ResumeFormData,
  resume: GeneratedResume,
): string => {
  const density = estimateDensity(form, resume);

  // Adaptive values based on content density
  const bodyFontSize = density === 'high' ? '10pt' : density === 'low' ? '11.5pt' : '11pt';
  const sectionMargin = density === 'high' ? '14px' : density === 'low' ? '22px' : '18px';
  const bulletMargin = density === 'high' ? '2px' : '4px';
  const expEntryMargin = density === 'high' ? '10px' : '14px';
  const summaryLineHeight = density === 'low' ? '1.8' : '1.65';

  // Certifications: user-provided + AI-inferred (deduplicated)
  const userCerts = form.certifications
    ? form.certifications.split(',').map(c => c.trim()).filter(Boolean)
    : [];
  const inferredCerts = resume.inferredCertifications ?? [];
  const allCerts = [...new Set([...userCerts, ...inferredCerts])];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: ${bodyFontSize};
      color: #1a1a1a;
      line-height: 1.5;
      padding: 32px 40px;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
    }
    .header {
      border-bottom: 2.5px solid #5B4FE8;
      padding-bottom: 12px;
      margin-bottom: ${sectionMargin};
    }
    .name {
      font-size: 22pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.3px;
    }
    .role {
      font-size: 12pt;
      color: #5B4FE8;
      margin-top: 3px;
      font-weight: 600;
    }
    .contact {
      font-size: 9pt;
      color: #555;
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }
    .contact span::before {
      content: "•";
      margin-right: 6px;
      color: #5B4FE8;
    }
    .contact span:first-child::before { content: ""; margin-right: 0; }
    .section {
      margin-bottom: ${sectionMargin};
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      color: #5B4FE8;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .summary {
      font-size: ${bodyFontSize};
      color: #2a2a2a;
      line-height: ${summaryLineHeight};
    }
    .exp-entry {
      margin-bottom: ${expEntryMargin};
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .exp-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .exp-duration {
      font-size: 9pt;
      color: #666;
      white-space: nowrap;
    }
    .exp-company {
      font-size: 9.5pt;
      color: #444;
      font-style: italic;
      margin-bottom: 4px;
    }
    .bullet {
      font-size: 9.5pt;
      color: #2a2a2a;
      padding-left: 14px;
      position: relative;
      margin-bottom: ${bulletMargin};
      line-height: 1.45;
    }
    .bullet::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #5B4FE8;
      font-size: 8pt;
      top: 1px;
    }
    .project-entry {
      margin-bottom: ${expEntryMargin};
    }
    .project-name {
      font-size: 10pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 3px;
    }
    .project-tech {
      font-size: 9pt;
      color: #5B4FE8;
      font-style: italic;
      margin-bottom: 3px;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-pill {
      background: #f0eeff;
      color: #5B4FE8;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 500;
      border: 1px solid #d4d0ff;
    }
    .edu-entry {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .edu-left { flex: 1; }
    .edu-degree {
      font-size: 10.5pt;
      font-weight: 600;
      color: #1a1a1a;
    }
    .edu-institution {
      font-size: 9.5pt;
      color: #555;
      font-style: italic;
    }
    .edu-grade {
      font-size: 9pt;
      color: #666;
      margin-top: 1px;
    }
    .edu-right {
      font-size: 9.5pt;
      color: #666;
      text-align: right;
    }
    .cert-item {
      font-size: 9.5pt;
      color: #2a2a2a;
      padding-left: 14px;
      position: relative;
      margin-bottom: 3px;
    }
    .cert-item::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #5B4FE8;
      font-size: 8pt;
      top: 1px;
    }
    .achievement-item {
      font-size: 9.5pt;
      color: #2a2a2a;
      padding-left: 14px;
      position: relative;
      margin-bottom: 3px;
    }
    .achievement-item::before {
      content: "★";
      position: absolute;
      left: 0;
      color: #5B4FE8;
      font-size: 7pt;
      top: 2px;
    }
    .two-col {
      display: flex;
      gap: 24px;
    }
    .two-col > div { flex: 1; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="name">${form.fullName || 'Your Name'}</div>
    <div class="role">${form.targetRole}</div>
    <div class="contact">
      ${form.email ? `<span>${form.email}</span>` : ''}
      ${form.phone ? `<span>${form.phone}</span>` : ''}
      ${form.city ? `<span>${form.city}</span>` : ''}
      ${form.linkedin ? `<span>${form.linkedin}</span>` : ''}
    </div>
  </div>

  <!-- PROFESSIONAL SUMMARY -->
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">${resume.professionalSummary}</div>
  </div>

  <!-- WORK EXPERIENCE -->
  ${resume.enhancedExperiences.length > 0 ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${resume.enhancedExperiences.map(exp => `
    <div class="exp-entry">
      <div class="exp-header">
        <div class="exp-title">${exp.jobTitle}</div>
        <div class="exp-duration">${exp.duration}</div>
      </div>
      <div class="exp-company">${exp.company}</div>
      ${exp.bulletPoints.slice(0, 4).map(bp => `<div class="bullet">${bp}</div>`).join('')}
    </div>`).join('')}
  </div>` : ''}

  <!-- PROJECTS (separate from work experience) -->
  ${(resume.projects ?? []).length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${(resume.projects ?? []).map(proj => {
      // Split "Project Name | Tech Stack" if pipe present
      const parts = proj.name.split('|');
      const projName = parts[0]?.trim() ?? proj.name;
      const techStack = parts[1]?.trim() ?? '';
      return `
    <div class="project-entry">
      <div class="project-name">${projName}</div>
      ${techStack ? `<div class="project-tech">${techStack}</div>` : ''}
      ${proj.bulletPoints.slice(0, 3).map(bp => `<div class="bullet">${bp}</div>`).join('')}
    </div>`;
    }).join('')}
  </div>` : ''}

  <!-- EDUCATION + CERTIFICATIONS (two-column if both exist) -->
  ${allCerts.length > 0 ? `
  <div class="section">
    <div class="two-col">
      <div>
        <div class="section-title">Education</div>
        <div class="edu-entry">
          <div class="edu-left">
            <div class="edu-degree">${form.degree}</div>
            <div class="edu-institution">${form.institution}</div>
            ${form.grade ? `<div class="edu-grade">${form.grade}</div>` : ''}
          </div>
          <div class="edu-right">${form.graduationYear}</div>
        </div>
      </div>
      <div>
        <div class="section-title">Certifications</div>
        ${allCerts.map(cert => `<div class="cert-item">${cert}</div>`).join('')}
      </div>
    </div>
  </div>` : `
  <div class="section">
    <div class="section-title">Education</div>
    <div class="edu-entry">
      <div class="edu-left">
        <div class="edu-degree">${form.degree}</div>
        <div class="edu-institution">${form.institution}</div>
        ${form.grade ? `<div class="edu-grade">${form.grade}</div>` : ''}
      </div>
      <div class="edu-right">${form.graduationYear}</div>
    </div>
  </div>`}

  <!-- CORE SKILLS -->
  <div class="section">
    <div class="section-title">Core Skills</div>
    <div class="skills-grid">
      ${resume.coreSkills.slice(0, 12).map(skill => `<span class="skill-pill">${skill}</span>`).join('')}
    </div>
  </div>

  <!-- ACHIEVEMENTS (if present) -->
  ${(resume.achievements ?? []).length > 0 ? `
  <div class="section">
    <div class="section-title">Achievements</div>
    ${(resume.achievements ?? []).map(a => `<div class="achievement-item">${a}</div>`).join('')}
  </div>` : ''}

  <!-- LANGUAGES (if provided) -->
  ${form.languages ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="cert-item">${form.languages}</div>
  </div>` : ''}

  <!-- ATS keywords are intentionally NOT rendered — they are embedded in content above -->

</body>
</html>`;
};
