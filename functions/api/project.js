// Cloudflare Pages Function. Configure KV binding WARLIKE_SAVES and secret WARLIKE_CLOUD_TOKEN.
// Anonymous access is forbidden; never place the secret in frontend source control.
const unauthorized=()=>new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
function same(a,b){if(!a||!b||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
export async function onRequest(context){
 const {request,env}=context;
 if(!env.WARLIKE_SAVES||!env.WARLIKE_CLOUD_TOKEN)return new Response(JSON.stringify({error:'Cloud non configuré'}),{status:503,headers:{'Content-Type':'application/json'}});
 const token=(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
 if(!same(token,env.WARLIKE_CLOUD_TOKEN))return unauthorized();
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 if(request.method==='GET'){const stored=await env.WARLIKE_SAVES.get('main');return new Response(stored||'null',{headers});}
 if(request.method==='PUT'){const raw=await request.text();if(raw.length>150000)return new Response(JSON.stringify({error:'Projet trop volumineux'}),{status:413,headers});try{const data=JSON.parse(raw);if(!Array.isArray(data.entities)||data.entities.length>1000||!data.entities.every(x=>x&&typeof x.name==='string'&&Number.isFinite(x.x)&&Number.isFinite(x.y)))throw Error('Invalid scene')}catch{return new Response(JSON.stringify({error:'Scène invalide'}),{status:400,headers})}await env.WARLIKE_SAVES.put('main',raw);return new Response(JSON.stringify({ok:true}),{headers});}
 return new Response('Method not allowed',{status:405,headers:{Allow:'GET, PUT'}});
}
