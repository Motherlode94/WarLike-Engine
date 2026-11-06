import {state,notify} from '../core/state.js';
import {gameProject} from '../core/game-project.js';
import {workspace} from '../core/workspaces.js';
import {saveProject,hub} from '../core/project-hub.js';
import {record} from '../core/history.js';
import {newId,applyScriptSave,templates,languageFor} from '../../script-editor/core.js';

export function initScriptStudio(){
 if(document.getElementById('scriptStudioPanel'))return;
 const panel=document.createElement('section');panel.id='scriptStudioPanel';panel.className='script-studio-window';panel.hidden=true;panel.setAttribute('aria-label','WarLike Script Studio');
 const header=document.createElement('header'),title=document.createElement('strong');title.textContent='⌘ WarLike Script Studio';
 const maximize=document.createElement('button');maximize.textContent='⛶';maximize.title='Agrandir ou restaurer Script Studio';maximize.onclick=()=>panel.classList.toggle('maximized');
 const standalone=document.createElement('button');standalone.textContent='↗ Autonome';
 const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Fermer Script Studio');close.onclick=()=>{panel.hidden=true};
 const frame=document.createElement('iframe');frame.title='Éditeur de scripts WarLike';header.append(title,standalone,maximize,close);panel.append(header,frame);document.body.append(panel);
 const menuButton=document.createElement('button');menuButton.id='openScriptStudio';menuButton.type='button';menuButton.textContent='⌘ Script Studio · éditeur de code';
 const windowMenu=[...document.querySelectorAll('#studioMenus details')].find(d=>d.querySelector('summary')?.textContent==='Window');
 (windowMenu?.querySelector('.studio-dropdown')||document.getElementById('studioPrimaryActions')||document.body).append(menuButton);
 let session=null,channel=null,context=null,selectedScript=null,selectedEntity=null,childWindow=null;const answered=new Map();
 const cacheKey=()=> 'warlike.script-sources.'+gameProject.id+'.'+workspace.mode;
 const currentContext=()=>gameProject.id+'|'+workspace.mode;
 const snapshot=()=>({type:'init',session,binding:{projectId:gameProject.id,mode:workspace.mode,entityId:selectedEntity},title:gameProject.title,activeScriptId:selectedScript,scripts:structuredClone(gameProject.scripts||[])});
 function send(message){const data={...message,session};channel?.postMessage(data);if(frame.contentWindow)frame.contentWindow.postMessage(data,location.origin)}
 function restoreSources(){try{const saved=JSON.parse(localStorage.getItem(cacheKey())||'[]');for(const script of saved)if(!(gameProject.scripts||[]).some(s=>s.id===script.id))applyScriptSave(gameProject,{baseRevision:0,script})}catch{}}
 function receive(message){
  if(!message||message.session!==session)return;
  if(message.type==='ready'){if(context===currentContext())send(snapshot());return}
  if(message.type!=='save'||typeof message.requestId!=='string')return;
  if(answered.has(message.requestId)){send(answered.get(message.requestId));return}
  let response;
  try{
   if(context!==currentContext()||message.binding?.projectId!==gameProject.id||message.binding?.mode!==workspace.mode)throw Error('Le projet actif a changé. Rouvre Script Studio depuis ce projet.');
   if(state.playing)throw Error('Arrête Play avant d’actualiser les sources du projet. Le fichier sauvegardé reste disponible dans Script Studio.');
   const entity=state.entities.find(e=>e.id===selectedEntity),oldScripts=structuredClone(gameProject.scripts||[]),oldEntity=entity?structuredClone(entity):null;
   const result=applyScriptSave(gameProject,message,entity);
   if(result.ok){
    try{localStorage.setItem(cacheKey(),JSON.stringify(gameProject.scripts));if(hub.projectId&&!saveProject())throw Error('La sauvegarde du projet a échoué. Le fichier reste sauvegardé dans Script Studio.');}
    catch(error){try{localStorage.setItem(cacheKey(),JSON.stringify(oldScripts))}catch{}gameProject.scripts=oldScripts;if(entity){for(const key of Object.keys(entity))delete entity[key];Object.assign(entity,oldEntity)}throw error}
    record('Enregistrer le script '+result.script.name);notify();send({type:'saved',script:result.script});
   }
   response={type:'ack',requestId:message.requestId,...result};
  }catch(error){response={type:'ack',requestId:message.requestId,ok:false,error:error.message}}
  answered.set(message.requestId,response);if(answered.size>128)answered.delete(answered.keys().next().value);send(response);
 }
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow)receive(event.data)});
 function open({scriptId=null,entityId=state.selected.at(-1),language='csharp',autonomous=false}={}){
  if(state.playing){alert('Arrête Play avant de modifier un script.');return}
  gameProject.scripts??=[];restoreSources();
  selectedEntity=entityId;const entity=state.entities.find(e=>e.id===entityId);
  let script=gameProject.scripts.find(s=>s.id===scriptId)||gameProject.scripts.find(s=>entity?.scripts?.includes(s.id));
  if(!script&&entity?.csharpScript?.source){script={id:entity.csharpScript.scriptId||newId(),name:(entity.csharpScript.name||'MyBehaviour').replace(/\.cs$/i,'')+'.cs',source:entity.csharpScript.source,language:'csharp',revision:0};gameProject.scripts.push(script)}
  if(!script){const name={csharp:'MyBehaviour.cs',javascript:'script.js',typescript:'script.ts',python:'script.py',cpp:'script.cpp'}[language]||'script.txt';script={id:newId(),name,source:templates[language]||'',language:languageFor(name),revision:0};gameProject.scripts.push(script)}
  selectedScript=script.id;context=currentContext();answered.clear();channel?.close();session=newId();
  if(typeof BroadcastChannel!=='undefined'){channel=new BroadcastChannel('warlike.script-studio.'+session);channel.onmessage=e=>receive(e.data)}
  const url=new URL('./script-editor/index.html',location.href);url.searchParams.set('session',session);url.searchParams.set('project',gameProject.id);url.searchParams.set('mode',workspace.mode);
  if(autonomous){childWindow=window.open(url.href,'warlike-script-'+session);if(!childWindow)alert('Autorise les fenêtres pour ouvrir Script Studio, ou utilise le panneau intégré.');return}
  url.searchParams.set('embedded','1');frame.src=url.href;panel.hidden=false;
 }
 standalone.onclick=()=>{if(!session)return open({autonomous:true});const url=new URL('./script-editor/index.html',location.href);url.searchParams.set('session',session);url.searchParams.set('project',gameProject.id);url.searchParams.set('mode',workspace.mode);childWindow=window.open(url.href,'warlike-script-'+session);};menuButton.onclick=()=>{windowMenu?.removeAttribute('open');open()};
 document.addEventListener('warlike:script-open',event=>open(event.detail||{}));
 // Refresh already-open viewers when another editor in the engine saves C#.
 document.addEventListener('warlike:change',()=>{if(!session||context!==currentContext())return;for(const entity of state.entities){const source=entity.csharpScript,script=gameProject.scripts?.find(s=>s.id===source?.scriptId);if(script&&script.source!==source.source){const result=applyScriptSave(gameProject,{baseRevision:script.revision,script:{...script,name:source.name.replace(/\.cs$/i,'')+'.cs',source:source.source}},entity);if(result.ok){send({type:'saved',script:result.script});try{localStorage.setItem(cacheKey(),JSON.stringify(gameProject.scripts));if(hub.projectId&&!saveProject())throw Error('La sauvegarde du projet a échoué. Le fichier reste sauvegardé dans Script Studio.');}catch{}}}}});
}
