import type { LearningStage } from "@/lib/language/stages";
import type { PronunciationAssessment } from "@/lib/speaking/types";
export type VocabularyEntryType = "word" | "phrase";
export type VocabularyPhraseType = "phrasal_verb" | "idiom" | "collocation" | "fixed_expression" | "other";

export type VocabularyMeaning = {
  label?: string;
  definition: string;
  simple?: string;
  contextMeaning?: string;
  chinese?: string;
};

export type VocabularyExample = {
  sentence: string;
  note?: string;
};

export type VocabularySynonym = {
  term: string;
  nuance: string;
  interchangeable?: boolean;
  example?: string;
};

export type VocabularyFamilyItem = {
  term: string;
  partOfSpeech?: string;
  meaning?: string;
};

export type VocabularyDetail = {
  term: string;
  normalizedTerm: string;
  entryType: VocabularyEntryType;
  phraseType?: VocabularyPhraseType;
  partOfSpeech?: string;
  phonetic?: string;
  syllables?: string;
  stress?: string;
  pronunciationNote?: string;
  meanings: VocabularyMeaning[];
  examples: VocabularyExample[];
  synonyms: string[];
  synonymNotes?: VocabularySynonym[];
  antonyms: string[];
  collocations: string[];
  wordFamily: VocabularyFamilyItem[];
  grammarPatterns: string[];
  usageNotes: string[];
  commonMistakes: string[];
  topicTags: string[];
  psleUsefulness?: string;
  level?: LearningStage | "P6+";
};

export type LearnerVocabularyItem = {
  id: string;
  detail: VocabularyDetail;
  mastery: number;
  status: string;
  nextReviewAt: string | null;
  lastSeenAt: string | null;
  lastReviewedAt: string | null;
  reviewCount: number;
  correctStreak: number;
  sourceContentId: string | null;
  sourceSentence: string | null;
  learnerNote: string | null;
  contexts: Array<{ text: string; contentId: string | null; createdAt: string }>;
};


export type VocabularyTrainingProgress = {
  mastery: number;
  pronunciation_score: number;
  recognition_score: number;
  listening_score: number;
  spelling_score: number;
  usage_score: number;
};

export type PronunciationResult = {
  passed: boolean;
  matchScore: number;
  transcript: string;
  assessment: PronunciationAssessment;
  progress: VocabularyTrainingProgress | null;
  threshold: {
    match: number;
    azureAccuracy: number;
    azureCompleteness: number;
    azurePronunciation: number;
  };
};
