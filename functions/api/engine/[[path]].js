import {getToken,validAccount,ACCOUNT_HEADER,guardOrigin,forwardServer,forwarded,privateJson,readLimited} from '../../_engine-session.js';
const uuid='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const routes=[{regex:/^me$/,verbs:['GET']},{regex:/^projects$/,verbs:['GET','POST']},{regex:new RegExp('^projects/'+uuid+'$'),verbs:['GET','PUT','DELETE']}];
export async function onRequest(context){
 const {request}=context,path=Array.isArray(context.params.path)?context.params.path.join('/'):String(context.params.path||'');
 const route=routes.find(r=>r.regex.test(path));if(!route)return privateJson({error:'Route inconnue.'},404);
 if(!route.verbs.includes(request.method))return privateJson({error:'Méthode interdite.'},405);
 const token=getToken(request);if(!token)return privateJson({error:'Connexion requise.'},401);
 if(!['GET','HEAD'].includes(request.method)&&!guardOrigin(request))return privateJson({error:'Origine refusée.'},403);
 const headers=new Headers({Authorization:'Bearer '+token,Accept:'application/json'});
 try{
  if(path!=='me'){
   const expected=request.headers.get(ACCOUNT_HEADER);
   if(!validAccount(expected))return privateJson({error:'Identité à vérifier.',code:'IDENTITY_REQUIRED'},428);
   const proof=await forwardServer(context,'/api/engine/me',{headers});if(!proof.ok)return forwarded(proof);
   const actual=await proof.json();if(!validAccount(actual?.userId)||actual.engineAccess!==true)return privateJson({error:'Identité non vérifiée.'},502);
   if(actual.userId!==expected)return privateJson({error:'Le compte a changé.',code:'ACCOUNT_CHANGED'},401);
  }
  let body;if(!['GET','HEAD'].includes(request.method)){
   const type=request.headers.get('Content-Type')||'';
   if(type.split(';')[0].trim().toLowerCase()!=='application/json')return privateJson({error:'JSON requis.'},415);
   body=await readLimited(request,1024*1024+8192);headers.set('Content-Type',type);
  }
  return forwarded(await forwardServer(context,'/api/engine/'+path,{method:request.method,headers,body}));
 }catch{return privateJson({error:'Serveur WarLike indisponible.'},503);}
}
