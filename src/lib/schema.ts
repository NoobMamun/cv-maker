import { z } from "zod";

/**
 * Canonical CV data model. Everything (AI pipeline, editor, preview, PDF and
 * DOCX exporters, database rows) speaks this shape.
 */

const str = z.string().catch("");
const strList = z.array(z.string()).catch([]);

export const SECTION_KEYS = [
  "summary",
  "experience",
  "skills",
  "projects",
  "education",
  "certifications",
  "achievements",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Professional Summary",
  experience: "Work Experience",
  skills: "Skills",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
};

export const LinkSchema = z.object({ label: str, url: str });

export const ContactSchema = z.object({
  name: str,
  headline: str,
  email: str,
  phone: str,
  location: str,
  links: z.array(LinkSchema).catch([]),
});

export const ExperienceSchema = z.object({
  id: str,
  company: str,
  role: str,
  location: str,
  startDate: str,
  endDate: str,
  bullets: strList,
  hidden: z.boolean().catch(false),
});

export const EducationSchema = z.object({
  id: str,
  institution: str,
  degree: str,
  field: str,
  location: str,
  startDate: str,
  endDate: str,
  details: strList,
  hidden: z.boolean().catch(false),
});

export const SkillGroupSchema = z.object({
  id: str,
  category: str,
  items: strList,
});

export const ProjectSchema = z.object({
  id: str,
  name: str,
  role: str,
  link: str,
  date: str,
  description: str,
  bullets: strList,
  technologies: strList,
  hidden: z.boolean().catch(false),
});

export const CertificationSchema = z.object({
  id: str,
  name: str,
  issuer: str,
  date: str,
  hidden: z.boolean().catch(false),
});

export const AchievementSchema = z.object({
  id: str,
  text: str,
  hidden: z.boolean().catch(false),
});

export const ResumeSchema = z.object({
  contact: ContactSchema.catch({
    name: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    links: [],
  }),
  summary: str,
  experience: z.array(ExperienceSchema).catch([]),
  education: z.array(EducationSchema).catch([]),
  skills: z.array(SkillGroupSchema).catch([]),
  projects: z.array(ProjectSchema).catch([]),
  certifications: z.array(CertificationSchema).catch([]),
  achievements: z.array(AchievementSchema).catch([]),
  sectionOrder: z.array(z.enum(SECTION_KEYS)).catch([...SECTION_KEYS]),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;

export const JobSchema = z.object({
  title: str,
  company: str,
  seniority: str,
  responsibilities: strList,
  requiredQualifications: strList,
  preferredQualifications: strList,
  hardSkills: strList,
  softSkills: strList,
  keywords: strList,
});
export type Job = z.infer<typeof JobSchema>;

const importance = z.enum(["high", "medium", "low"]).catch("medium");

export const AnalysisSchema = z.object({
  fitScore: z.coerce.number().min(0).max(100).catch(50),
  verdict: str,
  matchingSkills: strList,
  missingKeywords: z
    .array(
      z.object({
        keyword: str,
        importance,
        advice: str,
      }),
    )
    .catch([]),
  relevantExperience: z
    .array(
      z.object({
        experienceId: str,
        relevance: importance,
        reason: str,
      }),
    )
    .catch([]),
  recommendations: strList,
  sectionsToOptimize: z
    .array(
      z.object({
        section: str,
        issue: str,
        suggestion: str,
      }),
    )
    .catch([]),
  clarifyingQuestions: z
    .array(
      z.object({
        id: str,
        question: str,
        reason: str,
      }),
    )
    .catch([]),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

/** Things the fact-guard noticed while merging AI output into the CV. */
export const ReviewFlagSchema = z.object({
  section: z.enum(SECTION_KEYS),
  itemId: str,
  severity: z.enum(["removed", "review"]),
  message: str,
});
export type ReviewFlag = z.infer<typeof ReviewFlagSchema>;

export const ScoresSchema = z.object({
  overall: z.number(),
  aiFit: z.number(),
  keywordCoverageBefore: z.number(),
  keywordCoverageAfter: z.number(),
  keywordsTotal: z.number(),
});
export type Scores = z.infer<typeof ScoresSchema>;

export const AnswerSchema = z.object({
  question: z.string().max(500),
  answer: z.string().max(2000),
});
export type Answer = z.infer<typeof AnswerSchema>;

export type TemplateId = "modern" | "classic" | "minimal";

export function emptyResume(): Resume {
  return ResumeSchema.parse({});
}
