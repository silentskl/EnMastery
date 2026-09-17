import { modelBridgeChat } from "@/lib/ai/modelbridge";
import type { ListeningMaterial, QuestionBasis } from "@/lib/listening/types";

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced || raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model did not return JSON");
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}
function validString(v: unknown): v is string { return typeof v === "string" && v.trim().length > 0; }

function normalizeQuestionType(q: Record<string, unknown>): "multiple_choice" | "short_answer" {
  const raw = String(q.questionType ?? q.type ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["multiple_choice", "multiplechoice", "mcq", "choice", "single_choice"].includes(raw)) return "multiple_choice";
  if (["short_answer", "shortanswer", "short", "free_text", "text"].includes(raw)) return "short_answer";
  // Structural fallback is safer than blindly defaulting every unknown type to MCQ.
  if (Array.isArray(q.options) && q.options.length > 0) return "multiple_choice";
  return "short_answer";
}

export function validateListeningMaterial(value: unknown, guided: boolean): ListeningMaterial {
  if (!value || typeof value !== "object") throw new Error("Invalid listening material JSON");
  const x = value as Record<string, unknown>;
  if (!validString(x.title) || !validString(x.description) || !validString(x.topic)) throw new Error("Generated listening material is missing title/description/topic");
  const body = x.body as Record<string, unknown> | undefined;
  if (!body || !validString(body.learningGoal) || !Array.isArray(body.passes) || body.passes.length < 3) throw new Error("Generated listening material requires a learning goal and 3 listening passes");
  const rawQuestions = Array.isArray(x.questions) ? x.questions : [];
  if (guided && rawQuestions.length < 3) throw new Error("Guided listening requires at least 3 questions");
  const questions=rawQuestions.map((value,index)=>{if(!value||typeof value!=="object")throw new Error(`Listening question ${index+1} is invalid`);const q=value as Record<string,unknown>;const qt=normalizeQuestionType(q);const prompt=validString(q.prompt)?q.prompt:validString(q.question)?q.question:"";if(!validString(prompt))throw new Error(`Listening question ${index+1} is missing prompt/question`);if(qt==="multiple_choice"){if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(v=>!validString(v)))throw new Error(`Listening question ${index+1} requires 4 options`);const ci=Number(q.correctOption ?? q.correctAnswer ?? q.answerIndex);if(!Number.isInteger(ci)||ci<0||ci>3)throw new Error(`Listening question ${index+1} has invalid correctOption`);return{questionType:qt,prompt:prompt.trim(),options:(q.options as string[]).map(v=>v.trim()),correctOption:ci,explanation:validString(q.explanation)?q.explanation.trim():"Review the evidence and try again.",marks:Math.max(1,Math.min(5,Number(q.marks)||1))};}return{questionType:qt,prompt:prompt.trim(),acceptedKeywords:Array.isArray(q.acceptedKeywords)?q.acceptedKeywords.filter(validString).map(v=>v.trim()):Array.isArray(q.keywords)?q.keywords.filter(validString).map(v=>v.trim()):[],modelAnswer:validString(q.modelAnswer)?q.modelAnswer.trim():validString(q.answer)?q.answer.trim():"",explanation:validString(q.explanation)?q.explanation.trim():"Review the evidence and try again.",marks:Math.max(1,Math.min(5,Number(q.marks)||1))};});
  x.questions=guided?questions:[];
  return x as unknown as ListeningMaterial;
}

export function listeningMaterialFromModelBridgeResponse(response: unknown, guided: boolean): ListeningMaterial {
  if(!response||typeof response!=="object")throw new Error("Historical ModelBridge response is invalid");
  const r=response as {choices?:Array<{message?:{content?:unknown}}>} ;
  const content=r.choices?.[0]?.message?.content;
  if(!validString(content))throw new Error("Historical ModelBridge response has no assistant content");
  return validateListeningMaterial(extractJson(content),guided);
}

export async function createListeningMaterial(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  schoolLevel: "P5" | "P6";
  topic: string;
  sourceTitle: string;
  sourceDescription?: string;
  basis: QuestionBasis;
  basisText?: string;
  trace?: import("@/lib/ai/modelbridge").ModelBridgeConfig["trace"];
  responseOverride?: unknown;
}) {
  const guided = args.basis !== "metadata_only" && Boolean(args.basisText?.trim());
  const reference = guided
    ? `Reliable listening basis (${args.basis}; do NOT reproduce it as a transcript for students):\n${args.basisText!.slice(0, 14000)}`
    : `Only metadata is available. Do NOT invent details claimed to be in the recording. Title: ${args.sourceTitle}\nDescription: ${(args.sourceDescription || "").slice(0, 2200)}`;
  const prompt = `You are designing a Singapore ${args.schoolLevel} PSLE English listening lesson. The media itself remains hosted by its original publisher. Create an age-appropriate lesson around the media.\n\n${reference}\n\nRequested topic: ${args.topic}\nQuestion basis: ${args.basis}\n\nReturn strict JSON only in this shape:\n{\n  "title":"...",\n  "description":"one sentence",\n  "topic":"...",\n  "body":{\n    "mode":"${guided ? "guided" : "authentic"}",\n    "learningGoal":"...",\n    "instructions":["...","..."],\n    "passes":[\n      {"title":"Pass 1 · Overall meaning","instruction":"Listen without pausing. Focus on the main idea."},\n      {"title":"Pass 2 · Details","instruction":"Listen again for details, sequence and relationships."},\n      {"title":"Pass 3 · Review","instruction":"Review your notes and complete the questions or reflection."}\n    ],\n    "topicVocabulary":[{"word":"...","pos":"noun","definition":"...","simple":"...","example":"..."}],\n    "studyNotes":["..."],\n    "sourceNote":"Media remains hosted by the original publisher."\n  },\n  "questions":[...]\n}\n\nRules:\n- Target slightly above ${args.schoolLevel} level but remain suitable for 10-12 year olds.\n- Use 3-5 useful topic vocabulary entries. Do not claim that vocabulary definitely occurs in the audio unless the reliable basis shows it.\n- ${guided ? "Create exactly 4 listening questions based only on the reliable basis: main idea, explicit detail, inference, and speaker purpose/attitude. Each question MUST use this schema: {\"questionType\":\"multiple_choice\"|\"short_answer\",\"prompt\":\"...\",...}. MCQ must have exactly 4 options and zero-based correctOption. Short answers need acceptedKeywords and modelAnswer. Add explanation and marks. Do not use the aliases type/question in new output." : "Set questions to an empty array. Metadata is not enough to create factual listening questions. Use studyNotes as reflection prompts, not answers about unheard content."}\n- Never include or reproduce a transcript in the student lesson.\n- Do not say that AI generated the lesson.`;
  if(args.responseOverride!==undefined)return listeningMaterialFromModelBridgeResponse(args.responseOverride,guided);
  const response = await modelBridgeChat({ baseUrl: args.baseUrl, apiKey: args.apiKey, model: args.model, trace:args.trace }, [
    { role: "system", content: "Return strict JSON only. Never invent facts about audio when only metadata is available." },
    { role: "user", content: prompt },
  ]);
  return listeningMaterialFromModelBridgeResponse(response,guided);
}
