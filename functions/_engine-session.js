// Account identity is verified by WarLike Server, never by a browser-supplied user ID.
export const COOKIE='__Host-warlike-engine';
export const ACCOUNT_HEADER='X-Warlike-Engine-Account';
export const validAccount=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(v);
export function getToken(request){
 const hits=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+'='));
 const token=hits.length===1?hits[0].slice(COOKIE.length+1):'';
 return /^[A-Za-z0-9_-]{43}$/.test(token)?token:null;
}
export const sessionCookie=(token,age)=>COOKIE+'='+token+'; Path=/; Max-Age='+age+'; Secure; HttpOnly; SameSite=Strict';
export const noSessionCookie=()=>COOKIE+'=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict';
export const guardOrigin=request=>new URL(request.url).protocol==='https:'&&request.headers.get('Origin')===new URL(request.url).origin&&request.headers.get('Sec-Fetch-Site')!=='cross-site';
export function privateJson(body,status=200,extra={}){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra}});}
export async function forwardServer(context,path,{method='GET',headers={},body}={}){
 if(!context.env.WARLIKE_APP)return privateJson({error:'Service WarLike indisponible.'},503);
 const h=new Headers(headers);h.delete('Cookie');h.delete('Host');h.delete('X-Warlike-Identity');h.delete('X-Warlike-Signature');
 if(!['GET','HEAD'].includes(method))h.set('Origin','https://warlike-server.pages.dev');
 return context.env.WARLIKE_APP.fetch(new Request('https://warlike-server.pages.dev'+path,{method,headers:h,body,redirect:'manual'}));
}
export function forwarded(response){
 if(response.status>=300&&response.status<400)return privateJson({error:'Réponse serveur invalide.'},502);
 const h=new Headers(response.headers);h.delete('Set-Cookie');h.delete('Access-Control-Allow-Origin');h.set('Cache-Control','private, no-store');h.set('X-Content-Type-Options','nosniff');return new Response(response.body,{status:response.status,headers:h});
}
export async function readLimited(request,limit){
 if(Number(request.headers.get('Content-Length')||0)>limit)throw Error('Requête trop volumineuse.');
 const buffer=await request.arrayBuffer();if(buffer.byteLength>limit)throw Error('Requête trop volumineuse.');
 return buffer;
}
