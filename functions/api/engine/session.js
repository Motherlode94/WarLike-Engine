import {forwardServer,guardOrigin,sessionCookie,noSessionCookie,getToken,privateJson,readLimited} from '../../_engine-session.js';
export async function onRequestPost(context){
 const {request}=context;
 if(!guardOrigin(request))return privateJson({error:'Origine refusée.'},403);
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return privateJson({error:'JSON requis.'},415);
 try{
  const raw=await readLimited(request,2048),body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  if(!/^[A-Za-z0-9_-]{43}$/.test(body?.code||'')||!/^[A-Za-z0-9_-]{43,128}$/.test(body?.verifier||''))return privateJson({error:'Code invalide.'},400);
  const response=await forwardServer(context,'/api/engine/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok)return privateJson({error:'Association refusée.'},response.status);
  const value=await response.json(),age=Math.min(28800,Math.floor((value.expiresAt-Date.now())/1000));
  if(!/^[A-Za-z0-9_-]{43}$/.test(value.token||'')||!Number.isInteger(age)||age<1)return privateJson({error:'Réponse invalide.'},502);
  return privateJson({connected:true},200,{'Set-Cookie':sessionCookie(value.token,age)});
 }catch{return privateJson({error:'Association indisponible.'},503);}
}
export async function onRequestDelete(context){
 const {request}=context;if(!guardOrigin(request))return privateJson({error:'Origine refusée.'},403);
 const token=getToken(request);let revoked=!token;
 if(token){try{const r=await forwardServer(context,'/api/engine/revoke',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});revoked=r.ok;}catch{revoked=false;}}
 return privateJson({connected:false,revoked},revoked?200:202,{'Set-Cookie':noSessionCookie()});
}
