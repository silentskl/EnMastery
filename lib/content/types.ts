export type VocabularyEntry = {
  word: string;
  pos?: string;
  definition: string;
  simple?: string;
  example?: string;
  synonyms?: string[];
};

export type LearningBody = {
  summary?: string;
  readingTime?: number;
  paragraphs: string[];
  vocabulary?: VocabularyEntry[];
  sourceNote?: string;
};

export type LearningQuestion = {
  questionType: "multiple_choice" | "short_answer";
  prompt: string;
  options?: string[];
  correctOption?: number;
  acceptedKeywords?: string[];
  modelAnswer?: string;
  explanation?: string;
  marks?: number;
};

export type AdaptedLearningMaterial = {
  title: string;
  description: string;
  topic: string;
  body: LearningBody;
  questions: LearningQuestion[];
};
