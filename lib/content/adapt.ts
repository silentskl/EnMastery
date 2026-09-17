import { modelBridgeChat } from "@/lib/ai/modelbridge";
import { parseModelJson } from "@/lib/ai/model-json";
import type { AdaptedLearningMaterial } from "@/lib/content/types";

function validString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }

function validateMaterial(value: unknown): AdaptedLearningMaterial {
  if (!value || typeof value !== "object") throw new Error("Invalid learning material JSON");
  const x = value as Record<string, unknown>;
  if (!validString(x.title) || !validString(x.description) || !validString(x.topic)) throw new Error("Generated material is missing title/description/topic");
  const body = x.body as Record<string, unknown> | undefined;
  if (!body || !Array.isArray(body.paragraphs) || body.paragraphs.filter(validString).length < 3) throw new Error("Generated material requires at least 3 paragraphs");
  const questions = Array.isArray(x.questions) ? x.questions : [];
  if (questions.length < 3) throw new Error("Generated material requires at least 3 questions");
  return x as unknown as AdaptedLearningMaterial;
}

export async function adaptSourceToLearningMaterial(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceText: string;
  schoolLevel: "P5" | "P6";
  topic: string;
}) {
  const prompt = `You are an expert Singapore primary English curriculum editor. Create ORIGINAL learning material for ${args.schoolLevel} students preparing for PSLE English. Use the source only as factual/background reference. Do not copy sentences or distinctive phrasing from the source. Keep the reading slightly above grade level but age-appropriate.\n\nSource title: ${args.sourceTitle}\nSource URL: ${args.sourceUrl}\nRequested topic: ${args.topic}\nSource reference text:\n${args.sourceText.slice(0, 12000)}\n\nReturn JSON only with this exact shape:\n{\n  "title":"...",\n  "description":"one sentence",\n  "topic":"...",\n  "body":{\n    "summary":"...",\n    "readingTime":7,\n    "paragraphs":["...","...","...","..."],\n    "vocabulary":[{"word":"...","pos":"noun","definition":"...","simple":"...","example":"...","synonyms":["..."]}],\n    "sourceNote":"Adapted as original educational material from factual reference: ${args.sourceUrl}"\n  },\n  "questions":[\n    {"questionType":"multiple_choice","prompt":"...","options":["A","B","C","D"],"correctOption":1,"explanation":"...","marks":1},\n    {"questionType":"short_answer","prompt":"...","acceptedKeywords":["...","..."],"modelAnswer":"...","explanation":"...","marks":2},\n    {"questionType":"multiple_choice","prompt":"...","options":["A","B","C","D"],"correctOption":2,"explanation":"...","marks":1}\n  ]\n}\nUse 4-6 vocabulary items and 4 questions. Questions must cover literal understanding, inference, evidence, vocabulary or purpose. Do not mention that an AI wrote the material.`;

  const body = await modelBridgeChat({ baseUrl: args.baseUrl, apiKey: args.apiKey, model: args.model }, [
    { role: "system", content: "Return strict JSON only. You create original educational material and never reproduce source text verbatim." },
    { role: "user", content: prompt },
  ]);
  const content = body?.choices?.[0]?.message?.content;
  if (!validString(content)) throw new Error("ModelBridge returned no content");
  return validateMaterial(await parseModelJson({text:content,expected:"object",repair:{baseUrl:args.baseUrl,apiKey:args.apiKey,model:args.model},purpose:"reading material adaptation"}));
}

export async function generateQuestionsForText(args:{baseUrl:string;apiKey:string;model:string;schoolLevel:"P5"|"P6";title:string;text:string}) {
  const prompt=`Create 4 PSLE-aligned reading comprehension questions for this ${args.schoolLevel} passage. Return JSON only as {"questions":[...]}. Use a mix of multiple_choice and short_answer. Each multiple_choice needs 4 options and zero-based correctOption. Each short_answer needs 3-6 acceptedKeywords and a modelAnswer. Include explanation and marks (1 or 2). Passage title: ${args.title}\n\n${args.text.slice(0,10000)}`;
  const body=await modelBridgeChat({baseUrl:args.baseUrl,apiKey:args.apiKey,model:args.model},[{role:"system",content:"Return strict JSON only. Questions must test literal understanding, inference, evidence or vocabulary in context."},{role:"user",content:prompt}]);
  const content=body?.choices?.[0]?.message?.content;
  if(!validString(content)) throw new Error("ModelBridge returned no question content");
  const parsed=await parseModelJson({text:content,expected:"object",repair:{baseUrl:args.baseUrl,apiKey:args.apiKey,model:args.model},purpose:"reading question generation"}) as {questions?:unknown};
  if(!Array.isArray(parsed.questions)) throw new Error("Generated question JSON is invalid");
  return parsed.questions as AdaptedLearningMaterial["questions"];
}
