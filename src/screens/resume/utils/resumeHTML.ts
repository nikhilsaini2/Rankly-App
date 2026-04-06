import type { ResumeFormData, GeneratedResume } from '../types/resume.types'

export const generateResumeHTML = (
  form: ResumeFormData,
  resume: GeneratedResume
): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      font-size: 11pt;
      color: #1a1a1a;
      line-height: 1.5;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #6C63FF;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .name {
      font-size: 26pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.5px;
    }
    .role {
      font-size: 13pt;
      color: #6C63FF;
      margin-top: 4px;
      font-weight: 500;
    }
    .contact {
      font-size: 9.5pt;
      color: #555;
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #6C63FF;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .summary {
      font-size: 10.5pt;
      color: #333;
      line-height: 1.7;
    }
    .exp-entry {
      margin-bottom: 14px;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .exp-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .exp-duration {
      font-size: 9.5pt;
      color: #777;
    }
    .exp-company {
      font-size: 10pt;
      color: #555;
      font-style: italic;
      margin-bottom: 5px;
    }
    .bullet {
      font-size: 10pt;
      color: #333;
      padding-left: 16px;
      position: relative;
      margin-bottom: 3px;
    }
    .bullet::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #6C63FF;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill-pill {
      background: #f0eeff;
      color: #6C63FF;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 9.5pt;
      font-weight: 500;
      border: 1px solid #d4d0ff;
    }
    .edu-entry {
      display: flex;
      justify-content: space-between;
    }
    .edu-left { flex: 1; }
    .edu-degree {
      font-size: 11pt;
      font-weight: 600;
      color: #1a1a1a;
    }
    .edu-institution {
      font-size: 10pt;
      color: #555;
      font-style: italic;
      margin-bottom: 4px;
    }
    .edu-right {
      text-align: right;
      font-size: 10pt;
      color: #777;
    }
    .cert-item, .lang-item {
      font-size: 10pt;
      color: #333;
      padding-left: 16px;
      position: relative;
      margin-bottom: 3px;
    }
    .cert-item::before, .lang-item::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #6C63FF;
    }
    .keywords {
      font-size: 9pt;
      color: #888;
      margin-top: 8px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${form.fullName}</div>
    <div class="role">${form.targetRole}</div>
    <div class="contact">
      ${form.email ? `<span>${form.email}</span>` : ""}
      ${form.phone ? `<span>${form.phone}</span>` : ""}
      ${form.city ? `<span>${form.city}</span>` : ""}
      ${form.linkedin ? `<span>${form.linkedin}</span>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">${resume.professionalSummary}</div>
  </div>

  ${
    resume.enhancedExperiences.length > 0
      ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${resume.enhancedExperiences
      .map(
        (exp) => `
    <div class="exp-entry">
      <div class="exp-header">
        <div class="exp-title">${exp.jobTitle}</div>
        <div class="exp-duration">${exp.duration}</div>
      </div>
      <div class="exp-company">${exp.company}</div>
      ${exp.bulletPoints
        .map((bp) => `<div class="bullet">${bp}</div>`)
        .join("")}
    </div>`,
      )
      .join("")}
  </div>`
      : ""
  }

  <div class="section">
    <div class="section-title">Education</div>
    <div class="edu-entry">
      <div class="edu-left">
        <div class="edu-degree">${form.degree}</div>
        <div class="edu-institution">${form.institution}</div>
        ${form.grade ? `<div class="edu-institution">${form.grade}</div>` : ""}
      </div>
      <div class="edu-right">${form.graduationYear}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Core Skills</div>
    <div class="skills-grid">
      ${resume.coreSkills
        .map((skill) => `<span class="skill-pill">${skill}</span>`)
        .join("")}
    </div>
  </div>

  ${
    form.certifications
      ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${form.certifications
      .split(",")
      .map((cert) => `<div class="cert-item">${cert.trim()}</div>`)
      .join("")}
  </div>`
      : ""
  }

  ${
    form.languages
      ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <div class="lang-item">${form.languages}</div>
  </div>`
      : ""
  }

  <div class="keywords">
    ATS Keywords: ${resume.atsKeywords.join(", ")}
  </div>
</body>
</html>
`
}
