export const OFFICIAL_SYLLABUS_SOURCES = [
  { code: "SEAB-PSLE-HUB", title: "SEAB PSLE Hub", url: "https://www.seab.gov.sg/psle/", kind: "html" },
  { code: "SEAB-PSLE-FORMATS", title: "SEAB PSLE Formats 2026", url: "https://www.seab.gov.sg/psle/psle-formats-examined-in-2026/", kind: "html" },
  {
    code: "SEAB-PSLE-ENGLISH-0001-2026",
    title: "PSLE English Language 0001 - 2026",
    url: "https://www.seab.gov.sg/files/PSLE%20Syllabus%20documents/2026%20PSLE/0001_y26_sy.pdf",
    kind: "pdf",
    discoveryUrl: "https://www.seab.gov.sg/psle/psle-formats-examined-in-2026/",
    linkMatch: "0001",
  },
  {
    code: "MOE-PRIMARY-ENGLISH-2020",
    title: "MOE English Language Teaching and Learning Syllabus 2020 (Primary)",
    url: "https://www.moe.gov.sg/-/media/files/primary/2020-english-language-primary.ashx",
    kind: "pdf",
  },
] as const;
