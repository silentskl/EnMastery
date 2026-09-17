import { modelBridgeChat } from "@/lib/ai/modelbridge";

export type BankCategory = "oral" | "reading_comprehension" | "cloze" | "writing";

export const BANK_SUBCATEGORIES: Record<BankCategory, readonly string[]> = {
  oral: ["conversation", "stimulus", "reading_aloud"],
  reading_comprehension: ["mixed", "literal", "inferential", "evaluative", "vocabulary", "visual_text", "synthesis", "open_comprehension"],
  cloze: ["grammar", "vocabulary", "comprehension_cloze"],
  writing: ["continuous", "situational"],
};

export type GeneratedBankQuestion = {
  questionType: string;
  subcategory: string;
  stem: Record<string, unknown>;
  answer: Record<string, unknown>;
  explanation: { text: string };
  marks: number;
  difficulty: number;
};

export type BankSourceProfile = {
  id: string;
  name: string;
  url: string;
  provider: string;
  sourceKind: string;
  usageMode: string;
  licenceNote?: string | null;
};

function cleanString(v: unknown, max = 5000) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function cleanStringArray(v: unknown, maxItems = 4, maxLen = 500) {
  return Array.isArray(v) ? v.map(x => cleanString(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];
}
function clampDifficulty(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : fallback;
}
function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const src = (fenced || text).trim();
  const a = src.indexOf("{");
  const b = src.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("Model did not return a JSON object");
  return JSON.parse(src.slice(a, b + 1)) as unknown;
}
function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function uniq(values: string[]) {
  return [...new Set(values.map(x => x.trim()).filter(Boolean))];
}

function validateOptions(stem: Record<string, unknown>, answer: Record<string, unknown>) {
  const options = cleanStringArray(stem.options, 4, 300);
  if (options.length !== 4 || uniq(options.map(x => x.toLowerCase())).length !== 4) {
    throw new Error("Objective bank item requires exactly four distinct options");
  }
  const correctOption = Number(answer.correctOption);
  if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption > 3) {
    throw new Error("Objective bank item requires correctOption 0-3");
  }
  return { options, correctOption };
}

export function validateGeneratedBankQuestion(
  value: unknown,
  args: { category: BankCategory; subcategory: string; difficulty: number; schoolLevel: "P5" | "P6" },
): GeneratedBankQuestion {
  if (!value || typeof value !== "object") throw new Error("Question JSON is invalid");
  const raw = value as Record<string, unknown>;
  const questionType = cleanString(raw.questionType, 80);
  const returnedSubcategory = cleanString(raw.subcategory, 80) || args.subcategory;
  const stem = raw.stem && typeof raw.stem === "object" ? { ...(raw.stem as Record<string, unknown>) } : {};
  const answer = raw.answer && typeof raw.answer === "object" ? { ...(raw.answer as Record<string, unknown>) } : {};
  const explanationRaw = raw.explanation && typeof raw.explanation === "object" ? raw.explanation as Record<string, unknown> : {};
  const explanation = cleanString(explanationRaw.text, 1600);
  const prompt = cleanString(stem.prompt, 3000);
  if (prompt.length < 12) throw new Error("Generated prompt is too short");
  if (!explanation) throw new Error("Generated explanation is required");

  let marks = Math.max(1, Math.min(20, Number(raw.marks) || 1));
  const difficulty = clampDifficulty(raw.difficulty, args.difficulty);

  if (args.category === "oral") {
    const allowed = ["oral_conversation", "oral_stimulus", "oral_reading_aloud"];
    if (!allowed.includes(questionType)) throw new Error("Unsupported oral question type");
    marks = Math.max(4, Math.min(10, marks || 4));
    if (questionType === "oral_reading_aloud") {
      const referenceText = cleanString(stem.referenceText, 3000);
      const wc = wordCount(referenceText);
      const min = args.schoolLevel === "P5" ? 65 : 75;
      const max = args.schoolLevel === "P5" ? 150 : 180;
      if (wc < min || wc > max) throw new Error(`Reading-aloud reference text must be ${min}-${max} words`);
      stem.referenceText = referenceText;
    }
    answer.rubric = cleanString(answer.rubric, 1000) || "AI oral practice rubric";
  } else if (args.category === "writing") {
    const allowed = ["writing_continuous", "writing_situational"];
    if (!allowed.includes(questionType)) throw new Error("Unsupported writing question type");
    const writingType = questionType === "writing_situational" ? "situational" : "continuous";
    stem.writingType = writingType;
    const minWords = Number(stem.minimumWords) || (writingType === "continuous" ? 150 : 100);
    stem.minimumWords = Math.max(writingType === "continuous" ? 120 : 80, Math.min(250, minWords));
    answer.rubric = cleanString(answer.rubric, 1200) || "PSLE-aligned writing practice rubric";
    marks = writingType === "situational" ? 14 : 20;
  } else if (args.category === "reading_comprehension") {
    const allowed = ["reading_mcq", "reading_open", "visual_text", "synthesis"];
    if (!allowed.includes(questionType)) throw new Error("Unsupported reading comprehension question type");
    const passage = cleanString(stem.passage, 7000);
    if (questionType !== "synthesis") {
      const wc = wordCount(passage);
      const min = questionType === "visual_text" ? 35 : (args.schoolLevel === "P5" ? 110 : 140);
      const max = args.schoolLevel === "P5" ? 430 : 560;
      if (wc < min || wc > max) throw new Error(`Reading passage must be ${min}-${max} words`);
      stem.passage = passage;
    }
    if (questionType === "reading_mcq" || questionType === "visual_text") {
      const { options, correctOption } = validateOptions(stem, answer);
      stem.options = options;
      answer.correctOption = correctOption;
    } else {
      const acceptedAnswers = cleanStringArray(answer.acceptedAnswers, 8, 600);
      const modelAnswer = cleanString(answer.answer, 1000) || cleanString(answer.modelAnswer, 1000);
      if (!modelAnswer && !acceptedAnswers.length) throw new Error("Open reading item needs an answer or acceptedAnswers");
      if (modelAnswer) answer.answer = modelAnswer;
      if (acceptedAnswers.length) answer.acceptedAnswers = acceptedAnswers;
    }
    marks = Math.max(1, Math.min(4, marks));
  } else {
    const allowed = ["grammar_cloze", "vocabulary_cloze", "comprehension_cloze", "grammar_mcq", "vocabulary_mcq"];
    if (!allowed.includes(questionType)) throw new Error("Unsupported cloze question type");
    const { options, correctOption } = validateOptions(stem, answer);
    stem.options = options;
    answer.correctOption = correctOption;
    marks = 1;
  }

  stem.prompt = prompt;
  const title = cleanString(stem.title, 240);
  if (title) stem.title = title;
  const topic = cleanString(stem.topic, 240);
  if (topic) stem.topic = topic;

  return {
    questionType,
    subcategory: returnedSubcategory,
    stem,
    answer,
    explanation: { text: explanation },
    marks,
    difficulty,
  };
}

function categoryInstructions(category: BankCategory, subcategory: string, schoolLevel: "P5" | "P6") {
  if (category === "oral") {
    if (subcategory === "reading_aloud") return `Create an oral_reading_aloud task with a ${schoolLevel === "P5" ? "65-150" : "75-180"}-word referenceText and a short delivery context.`;
    if (subcategory === "stimulus") return "Create an oral_stimulus prompt. Describe the stimulus in words inside the prompt; do not require an unavailable image. Ask for description/interpretation plus a reasoned personal response.";
    return "Create an oral_conversation prompt that encourages a developed answer and a reason, example or reflection.";
  }
  if (category === "writing") {
    return subcategory === "situational"
      ? "Create a writing_situational task with purpose, audience, context and 3-5 required content points. minimumWords around 100."
      : "Create a writing_continuous task suitable for PSLE practice, with a clear topic/scenario and minimumWords 150. Do not provide a model essay.";
  }
  if (category === "cloze") {
    if (subcategory === "vocabulary") return "Create one vocabulary_cloze or vocabulary_mcq item with exactly four plausible options and one unambiguous correctOption.";
    if (subcategory === "comprehension_cloze") return "Create one comprehension_cloze item with a short original context, exactly four plausible options and one unambiguous correctOption.";
    return "Create one grammar_cloze or grammar_mcq item with exactly four grammatically plausible options and one unambiguous correctOption.";
  }
  if (subcategory === "visual_text") return "Create a visual_text item using a self-contained text representation of a notice/poster/table in passage; exactly four options and one correctOption.";
  if (subcategory === "synthesis") return "Create a synthesis item testing PSLE-style sentence synthesis/transformation. Make it self-contained, require a rewritten sentence that preserves meaning, and provide acceptedAnswers and a model answer. Do not require a reading passage.";
  if (subcategory === "open_comprehension") return "Create a reading_open comprehension question with one original passage. Require a concise evidence-based written answer and provide acceptedAnswers and a model answer.";
  if (subcategory === "literal") return "Create a reading_mcq question testing explicit/literal comprehension. Include one original passage and four plausible options.";
  if (subcategory === "inferential") return "Create a reading_mcq question testing inference. Include one original passage and four plausible options.";
  if (subcategory === "evaluative") return "Create a reading_mcq or reading_open question testing purpose, attitude or evaluation. Include one original passage.";
  if (subcategory === "vocabulary") return "Create a reading_mcq question testing vocabulary in context. Include one original passage and four plausible options.";
  return "Create a reading_mcq or reading_open comprehension item. Include one original passage and test literal, inferential, vocabulary or evaluative comprehension.";
}

export async function generateQuestionBankItem(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  schoolLevel: "P5" | "P6";
  category: BankCategory;
  subcategory: string;
  topic: string;
  difficulty: number;
  skillName: string;
  source: BankSourceProfile;
  batchPosition: number;
  batchSize: number;
  referenceBrief?: string;
}) {
  const sourceRule = args.source.usageMode === "owned"
    ? "The source profile is owned by this platform. Even so, create a fresh original item unless explicitly told otherwise."
    : "The source is REFERENCE-ONLY. Never reproduce or closely paraphrase protected source passages/questions. Use only the source profile to align level, task family, topic domain or factual background, and write entirely original material.";
  const prompt = `Create ONE original Singapore ${args.schoolLevel} PSLE English Question Bank item.\n\nCategory: ${args.category}\nSubcategory: ${args.subcategory}\nSkill: ${args.skillName}\nTopic: ${args.topic}\nDifficulty 1-5: ${args.difficulty}\nBatch position: ${args.batchPosition} of ${args.batchSize}\nReference source profile: ${args.source.name} (${args.source.provider})\nReference URL: ${args.source.url}\nReference brief (derived, never copy verbatim): ${args.referenceBrief||"No fetched brief available; use the source profile only."}\nSource kind: ${args.source.sourceKind}\nUsage mode: ${args.source.usageMode}\nLicence note: ${args.source.licenceNote || "none"}\n\n${sourceRule}\n${categoryInstructions(args.category,args.subcategory,args.schoolLevel)}\n\nUse British/Singapore English and child-safe, age-appropriate contexts. Avoid current statistics, unverifiable claims and politically sensitive material. Make the item self-contained. Do not mention the reference source in the learner-facing question.\n\nReturn STRICT JSON only in this schema:\n{"questionType":"...","subcategory":"...","stem":{"title":"optional","passage":"optional","prompt":"...","options":["A","B","C","D"],"referenceText":"optional","writingType":"optional","minimumWords":150},"answer":{"correctOption":0,"acceptedAnswers":["..."],"answer":"...","rubric":"..."},"explanation":{"text":"..."},"marks":1,"difficulty":${args.difficulty}}\nOmit fields that do not apply, but never omit a required correct answer/rubric. Exactly one option must be correct for objective items.`;
  const body = await modelBridgeChat(
    { baseUrl: args.baseUrl, apiKey: args.apiKey, model: args.model },
    [
      { role: "system", content: "You are a meticulous Singapore primary English assessment editor. Return valid JSON only. Create original content, not copied source material." },
      { role: "user", content: prompt },
    ],
  );
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("ModelBridge returned no Question Bank content");
  return validateGeneratedBankQuestion(extractJson(content), args);
}

export async function buildQuestionBankSourceBrief(args:{baseUrl:string;apiKey:string;model:string;source:BankSourceProfile;sourceText:string}){
 const trimmed=args.sourceText.replace(/\s+/g," ").trim().slice(0,12000);if(!trimmed)return"";
 const prompt=`Create a SHORT internal reference brief for generating ORIGINAL Singapore P5/P6 English Question Bank items. Source: ${args.source.name} (${args.source.provider}), ${args.source.url}. Usage mode: ${args.source.usageMode}. Do not reproduce questions, passages or distinctive wording. Extract only: suitable age range, task/skill patterns, broad topic domains, factual themes that are safe to reuse, and difficulty cues. If the source is a syllabus/specimen, summarise assessment format and skill intent. Return plain text under 1200 characters.\n\nSource text for internal analysis only:\n${trimmed}`;
 const body=await modelBridgeChat({baseUrl:args.baseUrl,apiKey:args.apiKey,model:args.model},[{role:"system",content:"Summarise source characteristics without copying protected text. Plain text only."},{role:"user",content:prompt}]);
 const text=body?.choices?.[0]?.message?.content;return typeof text==="string"?text.replace(/```[\s\S]*?```/g," ").replace(/\s+/g," ").trim().slice(0,1400):"";
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(text: string) {
  return new Set(normalizeText(text).split(" ").filter(x => x.length > 2));
}
export function questionComparableText(stem: Record<string, unknown>) {
  return [cleanString(stem.title,300),cleanString(stem.passage,6000),cleanString(stem.prompt,2500),cleanString(stem.referenceText,3000)].filter(Boolean).join(" ");
}
export function lexicalSimilarity(a: string, b: string) {
  const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let inter=0;for(const x of A)if(B.has(x))inter++;const union=A.size+B.size-inter;return union?inter/union:0;
}
export async function fingerprintQuestion(stem: Record<string, unknown>) {
  const data = new TextEncoder().encode(normalizeText(questionComparableText(stem)));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2,"0")).join("");
}

export function localQualityScore(args:{category:BankCategory;question:GeneratedBankQuestion;novelty:number}){
  let score=45;const notes:string[]=[];const prompt=String(args.question.stem.prompt||"");
  if(prompt.length>=30){score+=8;notes.push("clear prompt");}
  if(args.question.explanation.text.length>=35){score+=8;notes.push("useful explanation");}
  if(args.category==="reading_comprehension"){
    const wc=wordCount(String(args.question.stem.passage||""));if(wc>=100){score+=12;notes.push("substantial passage");}
  }else if(args.category==="oral"){
    if(args.question.questionType==="oral_reading_aloud"?wordCount(String(args.question.stem.referenceText||""))>=65:prompt.length>=35){score+=12;notes.push("oral task developed");}
  }else if(args.category==="writing"){
    if(Number(args.question.stem.minimumWords||0)>=80){score+=12;notes.push("clear writing demand");}
  }else{
    if(Array.isArray(args.question.stem.options)&&args.question.stem.options.length===4){score+=12;notes.push("four-option structure");}
  }
  const noveltyPoints=Math.round(Math.max(0,Math.min(1,args.novelty))*15);score+=noveltyPoints;notes.push(`novelty ${Math.round(args.novelty*100)}%`);
  score=Math.max(0,Math.min(100,score));
  return{score,notes};
}
