import {hub,saveProject,createProject,openProject} from '../core/project-hub.js';
const PAIR_KEY='warlike-engine-pkce';
const PREFIX='warlike.hub.project.';
const SERVER='https://warlike-server.pages.dev';
const identityKey='warlike.engine.private.v1';
const idRegex=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
let account=null,remoteMap=new Map(),busy=false,saveFingerprint='',lastAccount='';
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
const sha=async input=>encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input))));
async function send(path,{method='GET',body,accountHeader=true}={}){
 const res=await fetch('/api/engine/'+path,{method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(accountHeader&&account?{'X-Warlike-Engine-Account':account.userId}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let output={};try{output=await res.json();}catch{}
 if(!res.ok){if([401,403,428].includes(res.status))clearIdentity();throw Error(output.error||'Connexion WarLike indisponible ('+res.status+').');}
 return output;
}
function clearIdentity(){account=null;remoteMap.clear();saveFingerprint='';lastAccount='';render();}
function capture(){
 if(!hub.projectId)throw Error('Ouvre un projet avant la sauvegarde cloud.');
 if(!saveProject())throw Error('Sauvegarde locale impossible. Le projet ne sera pas envoyé.');
 const value=JSON.parse(localStorage.getItem(PREFIX+hub.projectId)||'null');
 if(!value||!value.workspaces||!['2d','3d'].includes(value.type))throw Error('Projet Engine invalide.');
 return value;
}
const box=document.createElement('section');box.id='enginePrivateWorkspace';box.className='engine-private-workspace';
box.innerHTML='<h3>Compte WarLike · Engine privé</h3><p data-account-status>Connexion nécessaire pour retrouver tes jeux privés sur Cloudflare.</p><div class="engine-private-actions"><button type="button" data-account-connect>Se connecter</button><button type="button" data-account-save disabled>☁ Sauvegarder mon jeu</button><button type="button" data-account-refresh disabled>Mes jeux cloud</button><button type="button" data-account-disconnect disabled>Déconnexion</button></div><p data-account-error role="status"></p><div data-account-projects></div><p class="engine-private-warning">Les anciens projets locaux du navigateur ne sont pas attribués automatiquement à un compte. Transfert uniquement après choix explicite. Le stockage local hérité ne garantit pas la confidentialité sur un ordinateur partagé.</p>';
const style=document.createElement('style');style.textContent='.engine-private-workspace{padding:15px;border:1px solid #47534e;border-radius:8px;margin:12px 0;background:#1e2524;color:#e4e9e7}.engine-private-workspace h3{margin:0 0 8px}.engine-private-actions{display:flex;flex-wrap:wrap;gap:8px}.engine-private-actions button,.engine-cloud-row button{padding:8px 11px;border:1px solid #5d7068;border-radius:5px;background:#31413c;color:#f2f5f2;cursor:pointer}.engine-private-actions button:disabled{opacity:.5;cursor:not-allowed}.engine-cloud-row{padding:9px 0;border-bottom:1px solid #53615c;display:flex;gap:8px;align-items:center;justify-content:space-between}.engine-private-warning{font-size:12px;color:#b8c4be}.engine-private-workspace [data-account-error]{color:#e5c49b}';
const $=s=>box.querySelector(s);
function render(){
 $('[data-account-status]').textContent=account?'Connecté : '+(account.displayName||account.userId)+' · espace privé Cloudflare':'Compte déconnecté · espace cloud verrouillé';
 $('[data-account-connect]').hidden=!!account;
 for(const key of ['save','refresh','disconnect'])$('[data-account-'+key+']').disabled=!account||busy;
 if(!account)$('[data-account-projects]').replaceChildren();
}
async function connect(){
 const verifier=encode(crypto.getRandomValues(new Uint8Array(32))),state=encode(crypto.getRandomValues(new Uint8Array(24)));
 sessionStorage.setItem(PAIR_KEY,JSON.stringify({verifier,state,createdAt:Date.now()}));
 location.assign(SERVER+'/connect/engine?challenge='+encodeURIComponent(await sha(verifier))+'&state='+encodeURIComponent(state));
}
async function returnPairing(){
 const p=new URLSearchParams(location.hash.slice(1)),code=p.get('warlike_engine_pair');
 if(!code)return;
 const raw=sessionStorage.getItem(PAIR_KEY);sessionStorage.removeItem(PAIR_KEY);
 history.replaceState(null,'',location.pathname+location.search);
 if(!raw)throw Error('Association sans demande locale.');
 const prev=JSON.parse(raw);if(prev.state!==p.get('state')||Date.now()-prev.createdAt>300000)throw Error('Association expirée.');
 await send('session',{method:'POST',body:{code,verifier:prev.verifier},accountHeader:false});
}
async function identity(){
 const next=await send('me',{accountHeader:false});
 if(!idRegex.test(next.userId||'')||next.engineAccess!==true)throw Error('Compte Engine non vérifié.');
 if(account?.userId&&account.userId!==next.userId)clearIdentity();
 account=next;
 if(lastAccount!==next.userId){remoteMap.clear();saveFingerprint='';lastAccount=next.userId;}
 render();return next;
}
async function list(){
 await identity();
 const data=await send('projects'),region=$('[data-account-projects]');region.replaceChildren();
 for(const p of data.projects||[]){
  const row=document.createElement('div');row.className='engine-cloud-row';
  const label=document.createElement('span');label.textContent=p.name;
  const button=document.createElement('button');button.type='button';button.textContent='Télécharger une copie';
  button.onclick=()=>run(async()=>{
   const item=await send('projects/'+encodeURIComponent(p.id));
   const source=item.project;
   if(!source||!['2d','3d'].includes(source.type)||!source.workspaces||!['2d','3d'].every(m=>Array.isArray(source.workspaces[m]?.entities)&&Array.isArray(source.workspaces[m]?.selected)))throw Error('Sauvegarde cloud invalide.');
   const id=createProject(source.name||p.name,source.type);
   // Create a new local slot; never overwrite a user's existing scene.
   const cloned=structuredClone(source);cloned.name=source.name||p.name;
   for(const slot of Object.values(cloned.workspaces))if(slot.game)slot.game.id=id;
   localStorage.setItem(PREFIX+id,JSON.stringify(cloned));
   localStorage.removeItem(PREFIX+id+'.backup.v1');
   if(!openProject(id))throw Error('Impossible de rouvrir la copie cloud.');
   remoteMap.set(id,{id:p.id,revision:item.revision});saveFingerprint='';setMessage('Copie cloud ouverte. Les changements devront être sauvegardés.');
  });
  row.append(label,button);region.append(row);
 }
 if(!data.projects?.length)region.textContent='Aucun jeu privé dans ce compte.';
}
const setMessage=text=>$('[data-account-error]').textContent=text;
async function run(fn){if(busy)return;busy=true;render();setMessage('');try{await fn();}catch(e){setMessage(e.message||String(e));}finally{busy=false;render();}}
async function save(){
 await identity();
 const project=capture(),local=hub.projectId,entry=remoteMap.get(local);
 let result;
 if(entry)result=await send('projects/'+encodeURIComponent(entry.id),{method:'PUT',body:{project,expectedRevision:entry.revision}});
 else result=await send('projects',{method:'POST',body:{project}});
 remoteMap.set(local,{id:result.id,revision:result.revision});
 saveFingerprint=JSON.stringify(project);setMessage('Jeu sauvegardé dans ton espace privé.');
}
async function disconnect(){
 await fetch('/api/engine/session',{method:'DELETE',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
 clearIdentity();setMessage('Compte déconnecté. Les projets locaux du navigateur sont toujours présents.');
}
export async function mountPrivateWorkspace(){
 const hubPanel=document.querySelector('#hubOverlay .hub-window');if(!hubPanel)return;
 document.head.append(style);hubPanel.querySelector('.hub-heading')?.after(box);
 $('[data-account-connect]').onclick=()=>run(connect);
 $('[data-account-save]').onclick=()=>run(save);
 $('[data-account-refresh]').onclick=()=>run(list);
 $('[data-account-disconnect]').onclick=()=>run(disconnect);
 try{await returnPairing();await identity();}catch{clearIdentity();}
 render();
 // Autosave is active only with verified cloud identity; no invisible claim of ownership for legacy data.
 setInterval(()=>{if(!account||busy||!hub.projectId||document.hidden)return;let raw;try{raw=localStorage.getItem(PREFIX+hub.projectId)}catch{return}if(raw&&raw!==saveFingerprint)void run(save);},30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void mountPrivateWorkspace(),{once:true});else void mountPrivateWorkspace();
