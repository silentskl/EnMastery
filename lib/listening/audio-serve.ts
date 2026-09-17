export async function serveR2Audio(request:Request,bucket:R2Bucket,args:{key:string;mimeType:string;size:number}){
  const range=request.headers.get("range");
  const baseHeaders={"Content-Type":args.mimeType||"audio/mpeg","Accept-Ranges":"bytes","Cache-Control":"private, max-age=300"};
  if(range){const m=range.match(/^bytes=(\d*)-(\d*)$/);if(m){let start=m[1]?Number(m[1]):0;let end=m[2]?Number(m[2]):args.size-1;if(!m[1]&&m[2]){const suffix=Math.min(args.size,Number(m[2]));start=args.size-suffix;end=args.size-1;}start=Math.max(0,Math.min(start,args.size-1));end=Math.max(start,Math.min(end,args.size-1));const length=end-start+1;const obj=await bucket.get(args.key,{range:{offset:start,length}});if(!obj)return new Response("Not found",{status:404});return new Response(obj.body,{status:206,headers:{...baseHeaders,"Content-Range":`bytes ${start}-${end}/${args.size}`,"Content-Length":String(length)}});}}
  const obj=await bucket.get(args.key);if(!obj)return new Response("Not found",{status:404});return new Response(obj.body,{headers:{...baseHeaders,"Content-Length":String(args.size)}});
}
