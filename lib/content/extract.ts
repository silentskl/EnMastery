export type DiscoveredItem = { title: string; url: string; publishedAt?: string };
export type ExtractedSource = { url: string; title: string; excerpt: string; text: string; contentType: string; extractionMethod?: string };
export type SourceExtractionDetails = {
  code: string;
  sourceUrl: string;
  finalUrl?: string;
  httpStatus?: number;
  contentType?: string;
  fetchedBytes?: number;
  extractedCharacters?: number;
  extractionMethod?: string;
  title?: string;
};

export class SourceExtractionError extends Error {
  details: SourceExtractionDetails;
  constructor(message: string, details: SourceExtractionDetails) {
    super(message);
    this.name = "SourceExtractionError";
    this.details = details;
  }
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^metadata\.google\.internal$/i,
  /\.internal$/i,
];

const NON_CONTENT_PATH = /(?:^|\/)(?:helpandfeedback|feedback|contact-us?|contact|login|sign-in|signin|register|account|forms?|e-?services?|apply|application|submit|submission|submissions)(?:\/|$)/i;
const NON_CONTENT_TEXT = /\b(?:sign in to continue|log in to continue|session expired|enable javascript to continue|verify you are human|checking your browser|access denied|captcha|regulatory submissions?|submit (?:a |your )?(?:form|request|application)|feedback & enquiries)\b/i;
const CHALLENGE_TEXT = /\b(?:just a moment|cloudflare ray id|attention required|cf-chl-|challenge-platform|verify you are human|checking if the site connection is secure)\b/i;

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p\s*>/gi, "\n").replace(/<\/li\s*>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeReadableText(value: string) {
  const lines = stripTags(value).split(/\n+/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
  const out:string[]=[];let previous="";
  for(const line of lines){if(line===previous)continue;previous=line;out.push(line);}
  return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

export function validatePublicUrl(raw: string, allowedHost?: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only http/https URLs are allowed");
  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host))) throw new Error("Private or local network URLs are not allowed");
  if (allowedHost) {
    const allowed = allowedHost.toLowerCase();
    if (host !== allowed && !host.endsWith(`.${allowed}`)) throw new Error(`URL host must match ${allowedHost}`);
  }
  return url;
}

export function isLikelyNonContentUrl(raw: string) {
  try {
    const url=new URL(raw);
    return NON_CONTENT_PATH.test(url.pathname) || /(?:^|[?&])(?:login|signin|auth|redirect|returnurl)=/i.test(url.search);
  } catch { return true; }
}

async function safeFetch(raw: string, allowedHost?: string, maxRedirects = 4) {
  let current = validatePublicUrl(raw, allowedHost);
  for (let i = 0; i <= maxRedirects; i++) {
    let response:Response;
    try{
      response = await fetch(current.toString(), {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EnglishMastery/1.0; +https://study.wisewavesg.com)",
          "Accept": "text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/xml,text/xml,application/pdf;q=0.8,*/*;q=0.4",
          "Accept-Language": "en-SG,en;q=0.9",
        },
      });
    }catch(error){
      throw new SourceExtractionError(`SOURCE_FETCH_FAILED: ${error instanceof Error?error.message:"Could not fetch source"}`,{code:"SOURCE_FETCH_FAILED",sourceUrl:raw,finalUrl:current.toString()});
    }
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new SourceExtractionError("SOURCE_REDIRECT_INVALID: Redirect without Location header",{code:"SOURCE_REDIRECT_INVALID",sourceUrl:raw,finalUrl:current.toString(),httpStatus:response.status});
      current = validatePublicUrl(new URL(location, current).toString(), allowedHost);
      continue;
    }
    if (!response.ok) throw new SourceExtractionError(`SOURCE_HTTP_ERROR: Source returned HTTP ${response.status}`,{code:"SOURCE_HTTP_ERROR",sourceUrl:raw,finalUrl:current.toString(),httpStatus:response.status,contentType:response.headers.get("content-type")||undefined});
    const length = Number(response.headers.get("content-length") || "0");
    if (length > 2_500_000) throw new SourceExtractionError("SOURCE_TOO_LARGE: Source is larger than 2.5 MB",{code:"SOURCE_TOO_LARGE",sourceUrl:raw,finalUrl:current.toString(),httpStatus:response.status,contentType:response.headers.get("content-type")||undefined,fetchedBytes:length});
    return { response, finalUrl: current.toString() };
  }
  throw new SourceExtractionError("SOURCE_TOO_MANY_REDIRECTS: Too many redirects",{code:"SOURCE_TOO_MANY_REDIRECTS",sourceUrl:raw});
}

function xmlTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")) : "";
}

function collectJsonText(value:unknown,out:string[],depth=0){
  if(depth>8||value==null)return;
  if(Array.isArray(value)){for(const item of value.slice(0,80))collectJsonText(item,out,depth+1);return;}
  if(typeof value!=="object")return;
  const obj=value as Record<string,unknown>;
  for(const key of ["articleBody","text","body","content","description"]){const v=obj[key];if(typeof v==="string"&&v.trim().length>=120)out.push(normalizeReadableText(v));}
  for(const [key,v] of Object.entries(obj)){if(["articleBody","text","body","content","description"].includes(key))continue;collectJsonText(v,out,depth+1);}
}

function jsonLdCandidates(html:string){
  const out:string[]=[];const re=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m:RegExpExecArray|null;
  while((m=re.exec(html))&&out.length<12){const raw=m[1].trim();try{collectJsonText(JSON.parse(raw),out);}catch{try{collectJsonText(JSON.parse(decodeEntities(raw)),out);}catch{}}}
  return out.filter(Boolean);
}

function nextDataCandidates(html:string){
  const out:string[]=[];const blocks=[...html.matchAll(/<script\b[^>]*(?:id=["']__NEXT_DATA__["']|type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi)].slice(0,10);
  for(const m of blocks){const raw=m[1].trim();try{collectJsonText(JSON.parse(raw),out);}catch{try{collectJsonText(JSON.parse(decodeEntities(raw)),out);}catch{}}}
  return out.filter(Boolean);
}

function tagCandidates(html:string,tag:string){
  const re=new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,"gi"),out:string[]=[];let m:RegExpExecArray|null;
  while((m=re.exec(html))&&out.length<12){const text=normalizeReadableText(m[1]);if(text.length>=120)out.push(text);}
  return out;
}

function classCandidates(html:string){
  const out:string[]=[];const re=/<(?:div|section)\b[^>]*(?:class|id)=["'][^"']*(?:article[-_ ]?(?:body|content)|story[-_ ]?(?:body|content)|page[-_ ]?content|main[-_ ]?content|rich[-_ ]?text|content[-_ ]?body)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi;let m:RegExpExecArray|null;
  while((m=re.exec(html))&&out.length<12){const text=normalizeReadableText(m[1]);if(text.length>=120)out.push(text);}
  return out;
}

function scoreCandidate(text:string){
  const clean=text.trim();if(!clean)return -999;
  const letters=(clean.match(/[A-Za-z]/g)||[]).length,words=(clean.match(/[A-Za-z][A-Za-z'-]*/g)||[]).length;
  const navHits=(clean.match(/\b(home|menu|privacy|terms|cookie|contact|login|search|feedback)\b/gi)||[]).length;
  return Math.min(clean.length,18000)+Math.min(words,1200)*2+(letters/Math.max(1,clean.length))*500-navHits*80;
}

function pageWideCandidate(html:string){
  const cleaned=html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi," ")
    .replace(/<(nav|footer|header|aside|form|button)\b[\s\S]*?<\/\1>/gi, " ");
  return normalizeReadableText(cleaned);
}

function htmlTitle(html:string){
  const og=html.match(/<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1]
    ||html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*>/i)?.[1];
  return stripTags(og||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"Imported source").slice(0,220);
}

export async function discoverFromSource(baseUrl: string, allowedHost: string, sourceType: "rss" | "webpage") {
  const { response, finalUrl } = await safeFetch(baseUrl, allowedHost);
  const text = await response.text();
  const items: DiscoveredItem[] = [];
  const seen = new Set<string>();

  if (sourceType === "rss" || /xml|rss|atom/i.test(response.headers.get("content-type") || "")) {
    const blocks = text.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
    for (const block of blocks.slice(0, 40)) {
      const title = xmlTag(block, "title") || "Untitled source item";
      let link = xmlTag(block, "link");
      if (!link) link = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "";
      if (!link) continue;
      const absolute = new URL(decodeEntities(link), finalUrl).toString();
      try { validatePublicUrl(absolute, allowedHost); } catch { continue; }
      if(isLikelyNonContentUrl(absolute))continue;
      if (seen.has(absolute)) continue;
      seen.add(absolute);
      items.push({ title, url: absolute, publishedAt: xmlTag(block, "pubDate") || xmlTag(block, "updated") || undefined });
      if (items.length >= 20) break;
    }
  } else {
    const anchorRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const candidates: Array<DiscoveredItem & { score: number }> = [];
    const reject = /\b(privacy|terms|cookie|contact|about|login|sign[- ]?in|register|subscribe|donate|careers?|jobs?|sitemap|accessibility|feedback|newsletter|search|facebook|instagram|linkedin|youtube|regulatory submissions?|submit (?:a |your )?(?:form|request|application))\b/i;
    const prefer = /\b(news|story|stories|article|articles|feature|features|facts?|science|learn|education|media|press|release|environment|nature|history|technology|community|sustainability|climate|water|conservation)\b/i;
    let match: RegExpExecArray | null;
    while ((match = anchorRe.exec(text))) {
      const title = stripTags(match[2]);
      if (title.length < 12 || title.length > 180 || reject.test(title)) continue;
      let absolute: string;
      try { absolute = new URL(match[1], finalUrl).toString(); validatePublicUrl(absolute, allowedHost); } catch { continue; }
      if (/\.(?:jpg|jpeg|png|gif|svg|pdf|zip|mp4|mp3)(?:$|[?#])/i.test(absolute) || reject.test(absolute) || isLikelyNonContentUrl(absolute)) continue;
      if (seen.has(absolute)) continue; seen.add(absolute);
      const u = new URL(absolute); const segments = u.pathname.split('/').filter(Boolean);
      let score = 0;
      if (segments.length >= 2) score += 2;
      if (segments.length >= 4) score += 1;
      if (prefer.test(`${title} ${u.pathname}`)) score += 4;
      if (/\d{4}/.test(u.pathname)) score += 1;
      if (title.length >= 28) score += 1;
      if (u.pathname === '/' || segments.length === 0) score -= 5;
      candidates.push({ title, url: absolute, score });
    }
    candidates.sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title));
    items.push(...candidates.slice(0,20).map(({score:_,...item})=>item));
  }
  return items;
}

export async function extractSource(url: string, allowedHost: string): Promise<ExtractedSource> {
  const { response, finalUrl } = await safeFetch(url, allowedHost);
  const contentType = response.headers.get("content-type") || "text/html";
  const baseDetails:SourceExtractionDetails={code:"SOURCE_EXTRACTION_FAILED",sourceUrl:url,finalUrl,httpStatus:response.status,contentType};
  if (/pdf/i.test(contentType) || /\.pdf(?:$|[?#])/i.test(finalUrl)) throw new SourceExtractionError("SOURCE_PDF_REQUIRES_TEXT_EXTRACTION: PDF source detected; use a PDF-capable source workflow or an HTML article page",{...baseDetails,code:"SOURCE_PDF_REQUIRES_TEXT_EXTRACTION"});
  if (!/html|text|xml|xhtml/i.test(contentType)) throw new SourceExtractionError(`SOURCE_UNSUPPORTED_TYPE: Unsupported source type: ${contentType}`,{...baseDetails,code:"SOURCE_UNSUPPORTED_TYPE"});
  let html = await response.text();
  if (html.length > 2_500_000) html = html.slice(0, 2_500_000);
  const title=htmlTitle(html),details={...baseDetails,fetchedBytes:html.length,title};
  const diagnosticText=normalizeReadableText(html).slice(0,5000);
  if(CHALLENGE_TEXT.test(`${html.slice(0,12000)} ${diagnosticText}`))throw new SourceExtractionError("SOURCE_EXTRACTION_BLOCKED: Source returned a bot/challenge page instead of article content",{...details,code:"SOURCE_EXTRACTION_BLOCKED",extractedCharacters:diagnosticText.length,extractionMethod:"challenge_detection"});
  if(isLikelyNonContentUrl(finalUrl))throw new SourceExtractionError("SOURCE_NOT_CONTENT_PAGE: This URL path is a service, form, login or submission endpoint rather than an article/reference page",{...details,code:"SOURCE_NOT_CONTENT_PAGE",extractedCharacters:diagnosticText.length,extractionMethod:"url_classification"});

  const candidates:Array<{method:string;text:string}>=[];
  for(const text of jsonLdCandidates(html))candidates.push({method:"json_ld",text});
  for(const text of tagCandidates(html,"article"))candidates.push({method:"article",text});
  for(const text of tagCandidates(html,"main"))candidates.push({method:"main",text});
  for(const text of classCandidates(html))candidates.push({method:"content_container",text});
  for(const text of nextDataCandidates(html))candidates.push({method:"embedded_json",text});
  candidates.push({method:"page_text",text:pageWideCandidate(html)});
  const best=candidates.filter(x=>x.text).sort((a,b)=>scoreCandidate(b.text)-scoreCandidate(a.text))[0]||{method:"page_text",text:""};
  const text=best.text.slice(0,18_000),looksTransactional=isLikelyNonContentUrl(finalUrl)||NON_CONTENT_TEXT.test(`${title} ${diagnosticText.slice(0,2500)}`);
  if(text.length<300){
    const code=looksTransactional?"SOURCE_NOT_CONTENT_PAGE":"SOURCE_TEXT_TOO_SHORT";
    const message=looksTransactional
      ? "SOURCE_NOT_CONTENT_PAGE: This URL appears to be a service, form, login or submission page rather than an article/reference page"
      : `SOURCE_TEXT_TOO_SHORT: Only ${text.length} readable characters could be extracted; at least 300 are required`;
    throw new SourceExtractionError(message,{...details,code,extractedCharacters:text.length,extractionMethod:best.method});
  }
  return { url: finalUrl, title, excerpt: text.slice(0, 700), text, contentType, extractionMethod:best.method };
}
