export type IntensiveSegment={id?:string;order:number;startMs:number;endMs:number;text:string;normalized:string};
function parseClock(raw:string){const parts=raw.trim().split(":").map(Number);if(parts.some(x=>!Number.isFinite(x)))return null;if(parts.length===2)return Math.round((parts[0]*60+parts[1])*1000);if(parts.length===3)return Math.round((parts[0]*3600+parts[1]*60+parts[2])*1000);return null;}
export function normalizeListeningText(text:string){return text.toLowerCase().replace(/[^a-z0-9'\s]/g," ").replace(/\s+/g," ").trim();}
export function parseTimestampedTranscript(raw:string):IntensiveSegment[]{
 const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out:IntensiveSegment[]=[];
 for(const line of lines){const m=line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:-->|-|–)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:\||\t)\s*(.+)$/);if(!m)continue;const start=parseClock(m[1]),end=parseClock(m[2]),text=m[3].trim();if(start===null||end===null||end<=start||!text)continue;out.push({order:out.length+1,startMs:start,endMs:end,text,normalized:normalizeListeningText(text)});}
 if(out.length<2)throw new Error("Provide at least 2 timestamped lines in the form 00:00-00:06 | sentence");if(out.length>80)throw new Error("Maximum 80 segments per lesson");return out;
}
function tokens(text:string){return normalizeListeningText(text).split(" ").filter(Boolean);}
function lcs(a:string[],b:string[]){const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);return dp[a.length][b.length];}
export function transcriptSimilarity(target:string,response:string){const a=tokens(target),b=tokens(response);if(!a.length||!b.length)return 0;const matched=lcs(a,b);const precision=matched/b.length,recall=matched/a.length;return Math.round((precision+recall?2*precision*recall/(precision+recall):0)*100);}
