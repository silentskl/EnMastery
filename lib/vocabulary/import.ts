export type VocabularyImportItem={term:string;synonyms:string[]};

function normalise(v:unknown,max=90){return typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,max):""}
function parseCsvLine(line:string){
 const cells:string[]=[];let cell="",quoted=false;
 for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;continue;}if(ch===","&&!quoted){cells.push(cell.trim());cell="";}else cell+=ch;}
 cells.push(cell.trim());return cells;
}
export function parseVocabularyImportText(raw:string,maxItems=2000):VocabularyImportItem[]{
 const out=new Map<string,VocabularyImportItem>();
 for(const source of raw.replace(/^\uFEFF/,"").split(/\r?\n/)){
  const line=source.trim();if(!line)continue;const cells=parseCsvLine(line),term=normalise(cells[0]);
  if(!term||["word","words","term","terms","vocabulary","word / phrase","word/phrase"].includes(term.toLowerCase()))continue;
  const synonyms=[...new Set(cells.slice(1).flatMap(cell=>cell.split(/[;|/]+/)).map(x=>normalise(x)).filter(Boolean))].slice(0,12);
  const key=term.toLowerCase(),prev=out.get(key);out.set(key,{term,synonyms:[...new Set([...(prev?.synonyms||[]),...synonyms])].slice(0,12)});
  if(out.size>=maxItems)break;
 }
 return [...out.values()];
}
export function normaliseVocabularyImportItems(value:unknown,maxItems=2000):VocabularyImportItem[]{
 if(!Array.isArray(value))return[];const out=new Map<string,VocabularyImportItem>();
 for(const raw of value){const o=raw&&typeof raw==="object"?raw as Record<string,unknown>:{};const term=normalise(o.term);if(!term)continue;const source=Array.isArray(o.synonyms)?o.synonyms:typeof o.synonyms==="string"?String(o.synonyms).split(/[;|/]+/):[];const synonyms=[...new Set(source.map(x=>normalise(x)).filter(Boolean))].slice(0,12),key=term.toLowerCase(),prev=out.get(key);out.set(key,{term,synonyms:[...new Set([...(prev?.synonyms||[]),...synonyms])].slice(0,12)});if(out.size>=maxItems)break;}
 return [...out.values()];
}
