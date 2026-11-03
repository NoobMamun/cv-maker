import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Packer } from "docx";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { buildDocx } from "../src/lib/export/docx";
import { ResumePdf } from "../src/lib/export/pdf";
import { ResumeSchema, type TemplateId } from "../src/lib/schema";

const resume = ResumeSchema.parse({
  contact: { name: "Jane Doe", headline: "Data Analyst", email: "jane@example.com", phone: "+880 1700 000000", location: "Dhaka", links: [{ label: "", url: "linkedin.com/in/janedoe" }] },
  summary: "Data analyst with four years of experience turning sales data into decisions using Power BI, SQL and Python.",
  experience: [
    { id: "exp1", company: "Acme Corp", role: "Data Analyst", location: "Dhaka", startDate: "Jan 2021", endDate: "Present", bullets: ["Built Power BI dashboards used by 40 sales managers.", "Automated weekly reporting with Python and SQL, cutting preparation time by 30%."] },
    { id: "exp2", company: "Old Co", role: "Intern", startDate: "2020", endDate: "2020", bullets: ["Hidden role"], hidden: true },
  ],
  education: [{ id: "edu1", institution: "University of Dhaka", degree: "BSc", field: "Statistics", startDate: "2016", endDate: "2020" }],
  skills: [{ id: "s1", category: "Analytics", items: ["Python", "SQL", "Power BI"] }],
  certifications: [{ id: "c1", name: "PL-300 Power BI Data Analyst", issuer: "Microsoft", date: "2023" }],
  sectionOrder: ["summary", "experience", "skills", "education", "certifications"],
});

const out = process.env.EXPORT_OUT_DIR;
if (out) mkdirSync(out, { recursive: true });

for (const t of ["modern", "classic", "minimal"] as TemplateId[]) {
  test(`PDF renders (${t})`, async () => {
    const buf = await renderToBuffer(createElement(ResumePdf, { resume, template: t }) as never);
    assert.equal(buf.subarray(0, 4).toString(), "%PDF");
    assert.ok(buf.length > 2000);
    if (out) writeFileSync(join(out, `sample-${t}.pdf`), buf);
  });

  test(`DOCX renders (${t})`, async () => {
    const buf = await Packer.toBuffer(buildDocx(resume, t));
    assert.equal(buf.subarray(0, 2).toString(), "PK");
    if (out) writeFileSync(join(out, `sample-${t}.docx`), buf);
  });
}
