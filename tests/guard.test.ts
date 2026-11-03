import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTailoring, buildSource, computeScores } from "../src/lib/guard";
import { JobSchema, ResumeSchema } from "../src/lib/schema";
import { containsTerm, extractFigures, normalize } from "../src/lib/text";

const cvText = `Jane Doe
Data Analyst
Acme Corp, Jan 2021 - Present
- Built dashboards in Power BI for the sales team.
- Cleaned data with Python and SQL, reducing report time by 30%.
Skills: Python, SQL, Power BI, Excel
BSc Statistics, University of Dhaka, 2020`;

const original = ResumeSchema.parse({
  contact: { name: "Jane Doe", headline: "Data Analyst", email: "jane@example.com" },
  summary: "Analyst with experience in reporting.",
  experience: [
    {
      id: "exp1",
      company: "Acme Corp",
      role: "Data Analyst",
      startDate: "Jan 2021",
      endDate: "Present",
      bullets: ["Built dashboards in Power BI for the sales team.", "Cleaned data with Python and SQL, reducing report time by 30%."],
    },
  ],
  education: [{ id: "edu1", institution: "University of Dhaka", degree: "BSc", field: "Statistics", endDate: "2020" }],
  skills: [{ id: "skl1", category: "Skills", items: ["Python", "SQL", "Power BI", "Excel"] }],
  sectionOrder: ["summary", "experience", "skills", "education"],
});

const job = JobSchema.parse({
  title: "BI Analyst",
  hardSkills: ["Power BI", "SQL", "Tableau", "Snowflake"],
  keywords: ["data visualisation", "stakeholder management"],
});

test("normalize/containsTerm handle punctuation and aliases", () => {
  const hay = normalize("Worked with React. Also Node.js, k8s and C++.");
  assert.ok(containsTerm(hay, "react"));
  assert.ok(containsTerm(hay, "Node.js"));
  assert.ok(containsTerm(hay, "Kubernetes"));
  assert.ok(containsTerm(hay, "C++"));
  assert.ok(!containsTerm(hay, "Java"));
});

test("extractFigures ignores years but keeps metrics", () => {
  assert.deepEqual(extractFigures("In 2021 we cut cost by 30% and saved $1,200"), ["30%", "$1200"]);
});

test("guard keeps identity facts from the original even if the draft tries to change them", () => {
  const source = buildSource(cvText);
  const draft = {
    experience: [{ id: "exp1", bullets: ["Led data visualisation in Power BI for sales stakeholders."], company: "Google", role: "Head of Data" }],
  } as never;
  const { resume } = applyTailoring(original, draft, job, source);
  assert.equal(resume.experience[0].company, "Acme Corp");
  assert.equal(resume.experience[0].role, "Data Analyst");
  assert.equal(resume.experience[0].startDate, "Jan 2021");
  assert.equal(resume.education[0].institution, "University of Dhaka");
});

test("guard removes unsupported skills and flags them", () => {
  const source = buildSource(cvText);
  const { resume, flags } = applyTailoring(
    original,
    { skills: [{ category: "BI", items: ["Power BI", "Tableau", "SQL", "Snowflake"] }] },
    job,
    source,
  );
  assert.deepEqual(resume.skills[0].items, ["Power BI", "SQL"]);
  const removed = flags.find((f) => f.severity === "removed");
  assert.ok(removed?.message.includes("Tableau"));
  assert.ok(removed?.message.includes("Snowflake"));
});

test("user-confirmed answers make a skill admissible", () => {
  const source = buildSource(cvText, ["Yes, I used Tableau for 2 years at Acme."]);
  const { resume } = applyTailoring(original, { skills: [{ category: "BI", items: ["Tableau", "SQL"] }] }, job, source);
  assert.deepEqual(resume.skills[0].items, ["Tableau", "SQL"]);
});

test("guard flags invented metrics and JD keywords in bullets", () => {
  const source = buildSource(cvText);
  const { flags } = applyTailoring(
    original,
    {
      experience: [
        {
          id: "exp1",
          bullets: ["Reduced report time by 30% using Python and SQL.", "Migrated warehouse to Snowflake, saving 45% in costs."],
        },
      ],
    },
    job,
    source,
  );
  const msgs = flags.map((f) => f.message).join(" | ");
  assert.ok(msgs.includes("45%"), "invented 45% should be flagged");
  assert.ok(!msgs.includes("30%"), "30% exists in source and must not be flagged");
  assert.ok(msgs.includes('"Snowflake"'), "Snowflake is a JD term not in the CV");
});

test("headline with unsupported words is rejected", () => {
  const source = buildSource(cvText);
  const { resume } = applyTailoring(original, { headline: "Senior BI Engineer" }, job, source);
  assert.equal(resume.contact.headline, "Data Analyst");
  const ok = applyTailoring(original, { headline: "Data Analyst | Power BI" }, job, source);
  assert.equal(ok.resume.contact.headline, "Data Analyst | Power BI");
});

test("items not mentioned in a partial draft keep their visibility and content", () => {
  const source = buildSource(cvText);
  const hiddenEdu = { ...original, education: original.education.map((e) => ({ ...e, hidden: true })) };
  const { resume } = applyTailoring(hiddenEdu, { summary: "Data analyst skilled in Power BI and SQL." }, job, source);
  assert.equal(resume.education[0].hidden, true);
  assert.deepEqual(resume.skills, original.skills);
  assert.deepEqual(resume.experience[0].bullets, original.experience[0].bullets);
});

test("scores reflect keyword coverage deterministically", () => {
  const s = computeScores(original, original, job, 70);
  // Power BI + SQL of 6 terms
  assert.equal(s.keywordCoverageBefore, 33);
  assert.equal(s.keywordsTotal, 6);
  assert.equal(s.overall, Math.round(70 * 0.6 + 33 * 0.4));
});
