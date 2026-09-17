import { modelBridgeChat } from "@/lib/ai/modelbridge";

export type JsonRoot = "object" | "array" | "any";

type RepairConfig = { baseUrl: string; apiKey: string; model: string };

function rootMatches(value: unknown, expected: JsonRoot) {
  if (expected === "any") return value !== undefined;
  if (expected === "array") return Array.isArray(value);
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripFence(text: string) {
  const fenced = text.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i)?.[1];
  return (fenced || text).replace(/^\uFEFF/, "").trim();
}

function extractBalanced(text: string, expected: JsonRoot) {
  const clean = stripFence(text);
  const starts = expected === "array" ? ["["] : expected === "object" ? ["{"] : ["{", "["];
  let start = -1;
  for (let i = 0; i < clean.length; i++) {
    if (starts.includes(clean[i])) { start = i; break; }
  }
  if (start < 0) return clean;
  const open = clean[start], close = open === "[" ? "]" : "}";
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < clean.length; i++) {
    const ch = clean[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return clean.slice(start, i + 1);
    }
  }
  const last = clean.lastIndexOf(close);
  return last > start ? clean.slice(start, last + 1) : clean.slice(start);
}

function repairCommonJson(input: string) {
  let out = "", inString = false, escaped = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === "\\") { out += ch; escaped = true; continue; }
      if (ch === '"') { out += ch; inString = false; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") continue;
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
      continue;
    }
    if (ch === '"') { out += ch; inString = true; continue; }
    if (ch === "/" && input[i + 1] === "/") {
      while (i < input.length && input[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (ch === "/" && input[i + 1] === "*") {
      i += 2;
      while (i < input.length - 1 && !(input[i] === "*" && input[i + 1] === "/")) i++;
      i++;
      continue;
    }
    if (ch === ",") {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j++;
      if (input[j] === "}" || input[j] === "]") continue;
    }
    out += ch;
  }
  return out;
}

function parseCandidate(candidate: string, expected: JsonRoot) {
  const attempts = [candidate, repairCommonJson(candidate)];
  let last: unknown = null;
  for (const attempt of attempts) {
    try {
      const value = JSON.parse(attempt) as unknown;
      if (!rootMatches(value, expected)) throw new Error(`Expected JSON ${expected}`);
      return value;
    } catch (error) { last = error; }
  }
  throw last instanceof Error ? last : new Error("Invalid JSON");
}

export function parseModelJsonLocal(text: string, expected: JsonRoot = "any") {
  const candidate = extractBalanced(text, expected);
  if (!candidate) throw new Error("Model did not return JSON");
  return parseCandidate(candidate, expected);
}

export async function parseModelJson(args: {
  text: string;
  expected?: JsonRoot;
  repair?: RepairConfig;
  purpose?: string;
}) {
  const expected = args.expected || "any";
  try { return parseModelJsonLocal(args.text, expected); }
  catch (firstError) {
    if (!args.repair) {
      const err = firstError instanceof Error ? firstError.message : String(firstError);
      throw new Error(`Invalid model JSON: ${err}`);
    }
    const candidate = extractBalanced(args.text, expected).slice(0, 50000);
    const prompt = `Repair the following malformed JSON. Preserve the data and meaning; change syntax only as needed. Return ONLY valid JSON with a ${expected === "any" ? "JSON" : expected} root. Do not add markdown fences or commentary.\n\nMALFORMED JSON:\n${candidate}`;
    const body = await modelBridgeChat(args.repair, [
      { role: "system", content: "You are a JSON syntax repairer. Output strict RFC 8259 JSON only. Never add commentary." },
      { role: "user", content: prompt },
    ]);
    const repaired = body?.choices?.[0]?.message?.content;
    if (typeof repaired !== "string" || !repaired.trim()) {
      throw new Error(`Model JSON repair returned no content (${args.purpose || "model response"})`);
    }
    try { return parseModelJsonLocal(repaired, expected); }
    catch (repairError) {
      const first = firstError instanceof Error ? firstError.message : String(firstError);
      const second = repairError instanceof Error ? repairError.message : String(repairError);
      const excerpt = candidate.replace(/\s+/g, " ").slice(0, 600);
      throw new Error(`Invalid model JSON after automatic repair (${args.purpose || "model response"}). Initial parse: ${first}. Repair parse: ${second}. Response excerpt: ${excerpt}`);
    }
  }
}
