export type ClozeGenerationConfig={minChars:number;maxChars:number;blankCount:number};
export const DEFAULT_CLOZE_GENERATION_CONFIG:ClozeGenerationConfig={minChars:700,maxChars:1400,blankCount:8};
function integer(value:unknown,fallback:number){const n=Number(value);return Number.isFinite(n)?Math.round(n):fallback;}
export function parseClozeGenerationConfig(input:Record<string,unknown>):ClozeGenerationConfig{
  const minChars=integer(input.clozeMinChars,DEFAULT_CLOZE_GENERATION_CONFIG.minChars);
  const maxChars=integer(input.clozeMaxChars,DEFAULT_CLOZE_GENERATION_CONFIG.maxChars);
  const blankCount=integer(input.clozeBlankCount,DEFAULT_CLOZE_GENERATION_CONFIG.blankCount);
  if(minChars<200||minChars>6000)throw new Error("Cloze minimum characters must be between 200 and 6000");
  if(maxChars<200||maxChars>8000)throw new Error("Cloze maximum characters must be between 200 and 8000");
  if(maxChars<minChars)throw new Error("Cloze maximum characters must be greater than or equal to the minimum");
  if(blankCount<1||blankCount>30)throw new Error("Cloze words to fill must be between 1 and 30");
  return {minChars,maxChars,blankCount};
}
export function clozeConfigKey(c:ClozeGenerationConfig){return `${c.minChars}:${c.maxChars}:${c.blankCount}`;}
