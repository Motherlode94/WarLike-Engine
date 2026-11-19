// Optional WarLike MCP browser bridge. Never auto-connect, persist credentials,
// evaluate remote JS, or grant access to the underlying browser/host OS.
import {state,select,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {record} from '../core/history.js';
import {componentChoices,addObjectComponent} from '../core/component-definitions.js';

const endpoint='https://warlike-server.pages.dev/api/mcp';
const allowedWrite=new Set(['warlike_select_object','warlike_set_transform','warlike_add_component','warlike_set_component_property']);
const allowedRead=new Set(['warlike_list_objects','warlike_get_component']);
const safeId=id=>Number.isSafeInteger(id)&&id>0;
const safeName=name=>typeof name==='string'&&/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(name);
const object=id=>state.entities.find(e=>e.id===id);
const scalar=v=>v===null||['string','number','boolean'].includes(typeof v)&&!(typeof v==='number'&&!Number.isFinite(v));
export function executeMcpEditorCommand(name,args={},permission='read'){
 if(!allowedRead.has(name)&&!allowedWrite.has(name))throw Error('Commande MCP non autorisée.');
 if(allowedWrite.has(name)&&(permission!=='edit'||state.playing))throw Error('Édition refusée : autorisation ou mode Play.');
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Arguments invalides.');
 if(name==='warlike_list_objects'){
  const limit=Number.isSafeInteger(args.limit)?Math.min(100,Math.max(1,args.limit)):100;
  return {mode:workspace.mode,playing:state.playing,objects:state.entities.slice(0,limit).map(e=>({id:e.id,name:String(e.name||'GameObject').slice(0,100),type:e.type,enabled:e.enabled!==false}))};
 }
 if(!safeId(args.id))throw Error('ID d’objet invalide.');
 const entity=object(args.id);if(!entity)throw Error('GameObject introuvable.');
 if(name==='warlike_select_object'){select([entity.id]);return {selected:entity.id}}
 if(name==='warlike_set_transform'){
  const next=['x','y','rotation'].filter(key=>Object.hasOwn(args,key));
  if(!next.length)throw Error('Aucune propriété Transform spécifiée.');
  for(const key of next)if(typeof args[key]!=='number'||!Number.isFinite(args[key])||Math.abs(args[key])>100000)throw Error('Transform invalide.');
  for(const key of next)entity[key]=args[key];
  record('MCP : Transform '+entity.id);notify();
  return {updated:entity.id,transform:{x:entity.x,y:entity.y,rotation:entity.rotation}};
 }
 if(!safeName(args.component))throw Error('Nom de composant invalide.');
 const definition=componentChoices(workspace.mode).find(d=>d.id===args.component);
 if(!definition)throw Error('Composant non enregistré ou incompatible avec cette scène.');
 if(name==='warlike_add_component'){
  const added=addObjectComponent(entity,definition.id,workspace.mode);
  if(added){record('MCP : Component '+definition.id);notify()}
  return {objectId:entity.id,component:definition.id,added};
 }
 const data=entity[definition.id];
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Composant absent de cet objet.');
 if(name==='warlike_get_component'){
  const output=JSON.stringify(data);
  if(output.length>4000)throw Error('Composant trop volumineux ; utiliser Inspector.');
  return {objectId:entity.id,component:definition.id,data:JSON.parse(output)};
 }
 if(!safeName(args.property)||!Object.hasOwn(data,args.property)||!scalar(args.value))throw Error('Propriété non autorisée.');
 const current=data[args.property];
 if(!scalar(current)||current!==null&&typeof current!==typeof args.value)throw Error('Type de propriété incompatible.');
 data[args.property]=args.value;
 record('MCP : '+definition.id+'.'+args.property);notify();
 return {objectId:entity.id,component:definition.id,property:args.property,value:args.value};
}
export function installMcpBridge(){
 if(!globalThis.document?.body||document.getElementById('warlikeMcpBridge'))return;
 const panel=document.createElement('section');panel.id='warlikeMcpBridge';panel.hidden=true;
 panel.setAttribute('aria-label','WarLike MCP · Contrôle autorisé de l’éditeur');
 panel.style.cssText='position:fixed;right:18px;top:72px;z-index:90000;width:min(355px,calc(100vw - 36px));max-height:75vh;overflow:auto;padding:16px;border:1px solid var(--warlike-palette-border,#64748b);border-radius:10px;background:var(--warlike-palette-panel,#202831);color:var(--wl-text-panel,#fff);font:13px/1.5 system-ui;box-shadow:0 16px 40px #0009';
 const heading=document.createElement('h3');heading.textContent='WarLike MCP · WarLike Server';heading.style.margin='0 0 8px';
 const note=document.createElement('p');note.textContent='Accès volontaire au projet ouvert. Ne donne aucun accès au PC ni au navigateur entier. La clé reste en mémoire dans cet onglet.';
 const token=document.createElement('input');token.type='password';token.autocomplete='off';token.spellcheck=false;token.placeholder='Clé d’éditeur MCP (Server)';token.setAttribute('aria-label','Clé WarLike MCP');token.style.width='100%';
 const permission=document.createElement('select');permission.setAttribute('aria-label','Permission MCP');permission.style.width='100%';
 for(const [value,label] of [['read','Lecture seule'],['edit','Lecture + modification du projet']]){const opt=document.createElement('option');opt.value=value;opt.textContent=label;permission.append(opt)}
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Déconnecté.';
 const sessionDisplay=document.createElement('code');sessionDisplay.setAttribute('aria-label','Identifiant de session Engine');sessionDisplay.style.cssText='display:block;overflow-wrap:anywhere;margin:8px 0;font-size:11px';sessionDisplay.textContent='Aucune session MCP active.';
 const copySession=document.createElement('button');copySession.type='button';copySession.textContent='Copier ID de session';copySession.disabled=true;
 const connect=document.createElement('button');connect.type='button';connect.textContent='Connecter';
 const disconnect=document.createElement('button');disconnect.type='button';disconnect.textContent='Déconnecter';disconnect.disabled=true;
 const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.onclick=()=>{panel.hidden=true};
 const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap';controls.append(connect,disconnect,close);
 panel.append(heading,note,token,permission,controls,status,sessionDisplay,copySession);document.body.append(panel);
 const trigger=document.createElement('button');trigger.type='button';trigger.textContent='⬡ MCP';
 trigger.title='Connecter WarLike Engine au WarLike Server (autorisation explicite)';
 trigger.onclick=()=>{panel.hidden=!panel.hidden};
 const menu=document.querySelector('#openAnimationStudio')?.parentElement||document.querySelector('.top-menu')||document.querySelector('nav')||document.body;
 menu.append(trigger);
 let session=null,secret='',connectedPermission='read',active=false,timeout=0,errors=0;
 copySession.onclick=()=>{if(session&&navigator.clipboard?.writeText)void navigator.clipboard.writeText(session)};
 const request=async(method,payload)=>{
  const url=method==='GET'?endpoint+'?session='+encodeURIComponent(session):endpoint;
  const response=await fetch(url,{method,headers:{'Authorization':'Bearer '+secret,...(method!=='GET'?{'Content-Type':'application/json'}:{})},...(method!=='GET'?{body:JSON.stringify(payload)}:{}),credentials:'omit',cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'WarLike Server : erreur '+response.status);
  return result;
 };
 const stop=async()=>{
  active=false;if(timeout)clearTimeout(timeout);
  const oldSession=session;session=null;connect.disabled=false;disconnect.disabled=true;permission.disabled=false;copySession.disabled=true;sessionDisplay.textContent='Aucune session MCP active.';errors=0;
  if(oldSession&&secret)try{await request('PUT',{action:'disconnect',session:oldSession})}catch{}
  secret='';token.value='';status.textContent='Déconnecté.';
 };
 const poll=async()=>{
  if(!active||!session)return;
  try{
   const result=await request('GET');
   if(!active)return;
   const command=result.command;
   if(command){
    let output;
    try{output={ok:true,data:executeMcpEditorCommand(command.name,command.args,connectedPermission)}}
    catch(error){output={ok:false,error:String(error?.message||error).slice(0,200)}}
    await request('PUT',{action:'result',session,commandId:command.id,result:output});
    status.textContent='Connecté : '+connectedPermission+' · Dernière commande : '+command.name;
   }
  errors=0;
  }catch(error){
   errors++;
   status.textContent='Erreur de connexion ('+errors+'/3) : '+String(error.message||error).slice(0,130);
   if(errors>=3){void stop();return}
  }
  if(active)timeout=setTimeout(poll,1100);
 };
 connect.onclick=async()=>{
  if(active)return;
  if(token.value.trim().length<32){status.textContent='Clé Server invalide : 32 caractères minimum.';return}
  secret=token.value.trim();connectedPermission=permission.value;connect.disabled=true;
  try{const result=await request('PUT',{action:'connect',permission:connectedPermission});session=result.session;active=true;disconnect.disabled=false;permission.disabled=true;copySession.disabled=false;sessionDisplay.textContent='ID session : '+session;status.textContent='Connecté : '+connectedPermission+' · Utiliser cet ID dans les outils MCP';poll()}
  catch(error){connect.disabled=false;secret='';status.textContent='Connexion refusée : '+String(error.message||error)}
 };
 disconnect.onclick=()=>void stop();
 window.addEventListener('pagehide',()=>{active=false;if(timeout)clearTimeout(timeout)});
 return {disconnect:stop};
}
