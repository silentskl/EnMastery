export type SpeakingMode = "conversation" | "reading_aloud" | "stimulus";
export type SpeakingTrack = "daily" | "pet";

export type SpeakingPrompt = {
  id: string;
  title: string;
  schoolLevel: string;
  topic: string | null;
  description: string | null;
  mode: SpeakingMode;
  prompt: string;
  referenceText?: string;
  stimulusAlt?: string;
  stimulusImageUrl?: string;
  stimulusImageAlt?: string;
  examTrack?: "PET";
  targetSeconds?: number;
  sceneFocus?: string[];
  examinerPrompts?: string[];
};

export type ConversationFeedback = {
  reply: string;
  relevance: number;
  development: number;
  grammar: number;
  vocabulary: number;
  interaction: number;
  strengths: string[];
  improvements: string[];
  betterExpression?: string;
  followUpQuestion?: string;
};

export type PronunciationAssessment = {
  provider: "azure" | "practice_heuristic";
  transcript: string;
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number | null;
  pronunciation: number;
  wordsPerMinute?: number;
  words?: Array<{ word: string; accuracy?: number; errorType?: string }>;
  note?: string;
};
