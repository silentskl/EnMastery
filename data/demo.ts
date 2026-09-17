export const demoLearner = {
  name: "Alex",
  level: "P6",
  target: "AL1",
  projected: "AL2",
  projectionScore: 86,
  streak: 18,
  xp: 6430,
  minutesDone: 32,
  minutesTarget: 45,
};

export const todayTasks = [
  { id: "vocab", title: "Vocabulary review", meta: "12 due words", minutes: 5, xp: 10, status: "done" },
  { id: "listen", title: "Listening", meta: "Science · Intensive", minutes: 8, xp: 12, status: "done" },
  { id: "read", title: "Why Singapore's otters returned", meta: "Reading · P6", minutes: 12, xp: 15, status: "next" },
  { id: "speak", title: "Reading aloud", meta: "Oral · Fluency", minutes: 8, xp: 15, status: "todo" },
  { id: "synth", title: "Synthesis practice", meta: "Paper 2 · 8 questions", minutes: 10, xp: 12, status: "todo" },
] as const;

export const weakSkills = [
  { name: "Synthesis", value: 62 },
  { name: "Inference", value: 68 },
  { name: "Oral fluency", value: 71 },
];

export const domains = [
  { key: "listen", label: "Listen", icon: "LI", mastery: 72, detail: "Authentic audio, intensive listening and PSLE practice" },
  { key: "speak", label: "Speak", icon: "SP", mastery: 68, detail: "Reading aloud, stimulus conversation and AI speaking coach" },
  { key: "read", label: "Read", icon: "RE", mastery: 81, detail: "Guided reading, vocabulary, grammar and comprehension" },
  { key: "write", label: "Write", icon: "WR", mastery: 74, detail: "Situational and continuous writing with guided revision" },
] as const;
