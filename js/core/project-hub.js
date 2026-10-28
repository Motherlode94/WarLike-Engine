import {gameProject} from './game-project.js';
import {createGenreScene,normalizeGenre,genreTemplates} from './genre-templates.js';
import {inspectProject,downloadDiagnostic} from './project-diagnostics.js';
import {get3dAsset} from '../assets/catalog-3d.js';
import {prefab3d} from '../assets/catalog-3d.js';
import {resetHistory} from './history.js';
// WarLike Hub — local named projects, independent 2D/3D templates.
// Storage stays on this browser. Export JSON to transfer projects to another device.
import {workspace,restoreWorkspaces,workspacePayload} from './workspaces.js';
import {state,notify} from './state.js';
import {stopSources} from './audio-sources.js';
const INDEX='warlike.hub.projects.v1',PREFIX='warlike.hub.project.';
const THEME_KEY='warlike.hub.accent.v1';
const DEFAULT_ACCENT='#48cba9';
export const hubAccentPresets=['#48cba9','#58a6ff','#9b7beb','#ef709e','#e4a459','#85c66a','#e06c65','#a1a9b6'];
export const normalizeHubAccent=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toLowerCase():null;
export function setHubAccent(value,{persist=true}={}){
 const color=normalizeHubAccent(value);
 if(!color)return false;
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 const highlight=rgb.map(n=>Math.round(n*.78)).map(n=>n.toString(16).padStart(2,'0')).join('');
 const target=document.querySelector('#hubOverlay');
 if(target?.style){target.style.setProperty('--hub-accent',color);target.style.setProperty('--hub-accent-dark','#'+highlight)}
 if(hub.projectId)document.body?.style?.setProperty('--project-accent',color)
 if(persist){hub.accent=color;if(hub.projectId&&!state.playing)saveProject();else try{localStorage.setItem(THEME_KEY,color)}catch{}}
 return true;
}

const defaults2d=()=>[{id:1,name:'Player',type:'player',x:100,y:110,w:38,h:38,color:'#41cdb5'}];
const defaults3d=()=>[{...prefab3d('character-hero',1,150,150),name:'3D Player',playable3d:true}];
const entry=entities=>({entities,selected:[1],nextId:2,camera:{x:0,y:0,zoom:1}});
const safeRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const indexed=()=>safeRead(INDEX,[]).filter(p=>p&&typeof p.id==='string');
const uniqueId=()=>Date.now().toString(36)+'-'+Math.floor(Math.random()*1e8).toString(36);
export const assetPackChoices=['starter','kenney','community','both'];
export const sanitizeAssetPack=value=>assetPackChoices.includes(value)?value:'starter';
export const hub={projectId:null,projectName:'Sans titre',type:'2d',accent:DEFAULT_ACCENT,assetPack:'starter',genre:'sandbox'};
export function chooseProjectAssets(id,assetPack){
 const pack=sanitizeAssetPack(assetPack);
 const meta=indexed().find(p=>p.id===id);if(!meta)return false;
 if(hub.projectId===id){hub.assetPack=pack;saveProject()}
 else{
  const data=safeRead(PREFIX+id,null);if(!data)return false;
  data.assetPack=pack;localStorage.setItem(PREFIX+id,JSON.stringify(data));
  meta.assetPack=pack;meta.updated=Date.now();saveMeta(meta);
 }
 document.dispatchEvent(new CustomEvent('warlike:asset-pack-change',{detail:{projectId:id,assetPack:pack}}));
 return true;
}
export const listProjects=()=>indexed().sort((a,b)=>(b.updated||0)-(a.updated||0));
const assertName=name=>{const n=String(name||'').trim().slice(0,64);if(!n)throw Error('Choisis un nom de projet.');return n};
function saveMeta(meta){const all=indexed().filter(p=>p.id!==meta.id);all.unshift(meta);localStorage.setItem(INDEX,JSON.stringify(all))}
export function saveProject(){
 if(!hub.projectId||state.playing)return false;
 const data={version:5,...workspacePayload(),entities:state.entities,camera:state.camera,name:hub.projectName,type:hub.type,accent:hub.accent,assetPack:hub.assetPack,genre:hub.genre};
 try{localStorage.setItem(PREFIX+hub.projectId,JSON.stringify(data));saveMeta({id:hub.projectId,name:hub.projectName,type:hub.type,accent:hub.accent,assetPack:hub.assetPack,genre:hub.genre,updated:Date.now()});return true}catch{return false}
}
export function createProject(name,type,assetPack='starter',genre='sandbox'){
 if(state.playing)throw Error('Arrête Play avant de créer un projet.');
 if(hub.projectId)saveProject();
 name=assertName(name);if(!['2d','3d'].includes(type))throw Error('Type de projet invalide.');
 const chosenGenre=normalizeGenre(genre);
 const id=uniqueId(),data={workspaceMode:type,workspaces:{'2d':chosenGenre==='sandbox'?entry(defaults2d()):createGenreScene(chosenGenre,'2d'),'3d':chosenGenre==='sandbox'?entry(defaults3d()):createGenreScene(chosenGenre,'3d')}};
 if(!restoreWorkspaces(data))throw Error('Impossible de créer le projet.');
 gameProject.id=id;gameProject.title=name;
 Object.assign(hub,{projectId:id,projectName:name,type,accent:hub.accent||DEFAULT_ACCENT,assetPack:sanitizeAssetPack(assetPack),genre:chosenGenre});setHubAccent(hub.accent,{persist:false});state.demoGuide='';resetHistory();saveProject();notify();return id;
}
export function openProject(id){
 if(state.playing)throw Error('Arrête Play avant de changer de projet.');
 if(hub.projectId&&hub.projectId!==id)saveProject();
 const data=safeRead(PREFIX+id,null),meta=indexed().find(p=>p.id===id);
 if(!data||!meta||!restoreWorkspaces(data))throw Error('Projet introuvable ou corrompu.');
 gameProject.id=id;if(!data.workspaces?.[meta.type]?.game?.title)gameProject.title=meta.name;
 Object.assign(hub,{projectId:id,projectName:meta.name,type:meta.type,accent:normalizeHubAccent(data.accent)||normalizeHubAccent(meta.accent)||DEFAULT_ACCENT,assetPack:sanitizeAssetPack(data.assetPack||meta.assetPack),genre:normalizeGenre(data.genre||meta.genre)});setHubAccent(hub.accent,{persist:false});state.keys.clear();state.demoGuide='';resetHistory();notify();return true;
}
export function deleteProject(id){
 if(state.playing)throw Error('Arrête Play avant de supprimer.');
 localStorage.removeItem(PREFIX+id);localStorage.setItem(INDEX,JSON.stringify(indexed().filter(p=>p.id!==id)));
 if(hub.projectId===id){Object.assign(hub,{projectId:null,projectName:'Sans titre',type:'2d',accent:DEFAULT_ACCENT,assetPack:'starter',genre:'sandbox'});document.body?.style?.removeProperty('--project-accent')}
}
export function renameProject(id,name){
 name=assertName(name);
 const meta=indexed().find(p=>p.id===id);if(!meta)return false;
 if(hub.projectId===id){hub.projectName=name;saveProject()}
 else{meta.name=name;meta.updated=Date.now();saveMeta(meta);const data=safeRead(PREFIX+id,null);if(data){data.name=name;localStorage.setItem(PREFIX+id,JSON.stringify(data))}}
 return true;
}
export function importLegacyProject(){
 if(state.playing)throw Error('Arrête Play avant la récupération.');
 const legacy=safeRead('warlike.scene.v1',null);
 if(!legacy?.entities)return false;
 const name='Projet précédent';
 const id=createProject(name,legacy.workspaceMode==='3d'?'3d':'2d');
 if(legacy.workspaces)restoreWorkspaces(legacy);
 else{
  state.entities=structuredClone(legacy.entities);state.nextId=Math.max(0,...state.entities.map(e=>e.id||0))+1;state.selected=state.entities.length?[state.entities[0].id]:[];notify();
 }
 saveProject();return id;
}
export function initHub(){
 if(globalThis.__WARLIKE_BUILD__)return;
 const modal=document.querySelector('#hubOverlay'),cards=document.querySelector('#hubProjects'),name=document.querySelector('#hubProjectName'),type=document.querySelector('#hubProjectType'),assetPackSelect=document.querySelector('#hubAssetPack'),genreSelect=document.querySelector('#hubProjectGenre'),message=document.querySelector('#hubMessage');
 const title=document.querySelector('#studioProjectName');
 const projectSearch=document.querySelector('#hubProjectSearch'),projectFilter=document.querySelector('#hubProjectFilter'),projectCount=document.querySelector('#hubProjectCount');
 const picker=document.querySelector('#hubAccentColor'),hex=document.querySelector('#hubAccentHex'),palette=document.querySelector('#hubThemePalette'),reset=document.querySelector('#hubThemeReset');
 const currentAccent=()=>hub.projectId?hub.accent:(()=>{try{return normalizeHubAccent(localStorage.getItem(THEME_KEY))||DEFAULT_ACCENT}catch{return DEFAULT_ACCENT}})();
 const commitAccent=value=>{
  if(!setHubAccent(value)){hex.value=picker.value;message.textContent='Couleur invalide : utilise le format #RRGGBB.';return}
  picker.value=hex.value=value.toLowerCase();message.textContent='';
  palette.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===value.toLowerCase())));
 };
 for(const color of hubAccentPresets){
  const button=document.createElement('button');button.type='button';button.className='hub-theme-swatch';
  button.dataset.color=color;button.style.backgroundColor=color;button.title=color;button.setAttribute('aria-label','Couleur '+color);
  button.onclick=()=>commitAccent(color);palette.append(button);
 }
 picker.oninput=()=>{setHubAccent(picker.value,{persist:false});hex.value=picker.value};
 picker.onchange=()=>commitAccent(picker.value);
 hex.onchange=()=>commitAccent(hex.value.trim());
 reset.onclick=()=>commitAccent(DEFAULT_ACCENT);
 commitAccent(currentAccent());

 let wasPlaying=false;
 const updateTitle=()=>{title.textContent=hub.projectName+(hub.projectId?' · '+hub.type.toUpperCase():'')};
 const hide=()=>{document.dispatchEvent(new CustomEvent('warlike:asset-pack-change',{detail:{projectId:hub.projectId,assetPack:hub.assetPack}}));modal.hidden=true;document.body.classList.remove('hub-open');document.dispatchEvent(new Event('warlike:project'));updateTitle()};
 const show=()=>{if(state.playing)return;saveProject();picker.value=hex.value=hub.accent;setHubAccent(hub.accent,{persist:false});modal.hidden=false;document.body.classList.add('hub-open');render();message.textContent=''};
 const run=cb=>{try{cb();picker.value=hex.value=hub.accent;setHubAccent(hub.accent,{persist:false});hide()}catch(e){message.textContent=e.message}};
 function render(){
  cards.replaceChildren();
  const allProjects=listProjects();
  document.querySelector('#hubTotalProjects').textContent=String(allProjects.length);
  document.querySelector('#hub2dProjects').textContent=String(allProjects.filter(p=>p.type==='2d').length);
  document.querySelector('#hub3dProjects').textContent=String(allProjects.filter(p=>p.type==='3d').length);
  document.querySelector('#hubLastProject').textContent=allProjects.length&&Number.isFinite(allProjects[0].updated)?new Date(allProjects[0].updated).toLocaleDateString('fr-FR'):'—';
  const projects=allProjects.filter(p=>(projectFilter.value==='all'||p.type===projectFilter.value)&&p.name.toLocaleLowerCase().includes(projectSearch.value.trim().toLocaleLowerCase()));
  projectCount.textContent=projects.length+' projet'+(projects.length>1?'s':'');
  if(!projects.length){const empty=document.createElement('p');empty.className='hub-empty-projects';empty.textContent=projectSearch.value||projectFilter.value!=='all'?'Aucun projet ne correspond à ta recherche.':'Aucun projet créé. Choisis WarLike 2D ou 3D pour commencer.';cards.append(empty)}
  for(const p of projects){
   const item=document.createElement('div');item.className='hub-project-card';
   const info=document.createElement('div');const heading=document.createElement('strong');heading.textContent=p.name;
   const detail=document.createElement('small');detail.textContent=p.type.toUpperCase()+' · '+genreTemplates[normalizeGenre(p.genre)].label+' · Assets : '+({starter:'WarLike',kenney:'Kenney CC0',community:'Community CC0',both:'Kenney + Community'}[sanitizeAssetPack(p.assetPack)])+' · '+new Date(p.updated).toLocaleString();item.style.borderLeft='4px solid '+(normalizeHubAccent(p.accent)||DEFAULT_ACCENT);
   info.append(heading,detail);
   if(p.id===hub.projectId){const current=document.createElement('span');current.className='hub-current-pill';current.textContent='Actif';info.append(current)}
   const open=document.createElement('button');open.textContent='Ouvrir';open.onclick=()=>run(()=>openProject(p.id));
   const edit=document.createElement('button');edit.textContent='Renommer';edit.title='Renommer ce projet';edit.onclick=()=>{const next=prompt('Nouveau nom du projet',p.name);if(next!==null){try{renameProject(p.id,next);render()}catch(e){message.textContent=e.message}}};
   const del=document.createElement('button');del.textContent='×';del.title='Supprimer ce projet local';del.onclick=()=>{if(confirm('Supprimer définitivement le projet « '+p.name+' » ?')){deleteProject(p.id);render()}};
   const packs=document.createElement('select');packs.className='hub-project-pack';packs.setAttribute('aria-label','Pack d’assets de '+p.name);
   for(const [id,label] of [['starter','WarLike intégré'],['kenney','Kenney CC0'],['community','Community CC0'],['both','Kenney + Community']]){const option=document.createElement('option');option.value=id;option.textContent=label;packs.append(option)}
   packs.value=sanitizeAssetPack(p.assetPack);packs.disabled=p.type!=='3d';packs.title=p.type==='3d'?'Changer le pack de ce projet':'Packs 3D disponibles seulement pour projets 3D';
   packs.onchange=()=>{try{chooseProjectAssets(p.id,packs.value);render()}catch(error){message.textContent=error.message}};
   item.append(info,packs,open,edit,del);cards.append(item);
  }
  document.querySelector('#hubLegacy').hidden=!safeRead('warlike.scene.v1',null)?.entities;
 }
 const diagnosticPanel=modal.querySelector('#hubDiagnostics');
 const diagnosticResult=modal.querySelector('#hubDiagnosticsResult');
 let latestDiagnostic=null;
 const showDiagnostics=()=>{
  diagnosticPanel.hidden=false;
  if(!hub.projectId){diagnosticResult.textContent='Ouvre ou crée un projet pour analyser sa scène.';modal.querySelector('#hubDiagnosticsDownload').disabled=true;return}
  latestDiagnostic=inspectProject({entities:state.entities,name:hub.projectName,type:workspace.mode,assetLookup:get3dAsset});
  modal.querySelector('#hubDiagnosticsDownload').disabled=false;
  diagnosticResult.replaceChildren();
  const summary=document.createElement('p');
  summary.textContent=latestDiagnostic.summary.entities+' objets · '+latestDiagnostic.summary.players+' joueurs · '+latestDiagnostic.summary.errors+' erreurs · '+latestDiagnostic.summary.warnings+' avertissements';
  diagnosticResult.append(summary);
  const list=document.createElement('ul');
  for(const issue of latestDiagnostic.issues){
   const line=document.createElement('li');line.dataset.severity=issue.severity;
   line.append(document.createTextNode(issue.severity.toUpperCase()+' · '+issue.message));
   if(issue.entityId!==null&&state.entities.some(o=>o.id===issue.entityId)){
    const locate=document.createElement('button');locate.type='button';locate.textContent='Sélectionner';
    locate.title='Afficher l’objet concerné dans la hiérarchie et dans l’Inspector';
    locate.onclick=()=>{
     state.selected=[issue.entityId];hide();notify();
     document.querySelector('#sceneTab')?.click();
     document.dispatchEvent(new Event('warlike:change'));
    };
    line.append(' ',locate);
   }
   list.append(line);
  }
  diagnosticResult.append(list);
 };
 modal.querySelector('#hubDiagnosticsClose').onclick=()=>{diagnosticPanel.hidden=true};
 modal.querySelector('#hubDiagnosticsDownload').onclick=()=>{if(latestDiagnostic)downloadDiagnostic(latestDiagnostic)};
 const launch=mode=>{
  assetPackSelect.disabled=mode!=='3d';
  if(hub.projectId&&hub.type===mode){hide();return}
  type.value=mode;
  name.value=mode==='3d'?'Mon jeu 3D':'Mon jeu 2D';
  message.textContent='Module '+mode.toUpperCase()+' sélectionné : crée un projet ou ouvre un projet récent de ce type.';
  name.focus();
 };
 modal.querySelectorAll('[data-hub-app]').forEach(button=>button.onclick=()=>{
  const app=button.dataset.hubApp;
  if(app==='2d'||app==='3d'){launch(app);return}
  if(app==='diagnostics'){showDiagnostics();return}
  if(app==='assets'){
   if(!hub.projectId){
    type.value='3d';assetPackSelect.disabled=false;
    assetPackSelect.focus();assetPackSelect.scrollIntoView({block:'center',behavior:'smooth'});
    message.textContent='Choisis un pack puis crée un projet 3D.';
    return;
   }
   render();
   const current=Array.from(cards.querySelectorAll('.hub-project-card')).find(card=>card.querySelector('.hub-current-pill'));
   const chooser=current?.querySelector('.hub-project-pack');
   if(chooser&&!chooser.disabled){chooser.focus();chooser.scrollIntoView({block:'center',behavior:'smooth'});message.textContent='Choisis le pack de ton projet puis ouvre-le dans Studio.'}
   else{type.value='3d';assetPackSelect.disabled=false;assetPackSelect.focus();message.textContent='Crée un projet 3D pour sélectionner des packs 3D.'}
   return;
  }
 });
 const backupAll=modal.querySelector('#hubBackupAll');
 backupAll.addEventListener('click',()=>{
  try{
   if(hub.projectId&&!state.playing&&!saveProject())throw Error('Sauvegarde du projet actif impossible.');
   const projects=listProjects();
   if(!projects.length){message.textContent='Aucun projet à sauvegarder.';return}
   const archive={format:'warlike.hub.backup.v1',exportedAt:new Date().toISOString(),projects:projects.map(meta=>({meta,scene:safeRead(PREFIX+meta.id,null)}))};
   if(archive.projects.some(entry=>!entry.scene))throw Error('Un projet est introuvable : archive interrompue.');
   const blob=new Blob([JSON.stringify(archive,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob);const link=document.createElement('a');
   link.href=url;link.download='warlike-projets-'+new Date().toISOString().slice(0,10)+'.json';
   link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   message.textContent=projects.length+' projet(s) exporté(s) en archive JSON. Conserve ce fichier en sécurité.';
  }catch(error){message.textContent='Export impossible : '+error.message}
 });
 projectSearch.addEventListener('input',render);
 projectFilter.addEventListener('change',render);
 type.addEventListener('change',()=>{assetPackSelect.disabled=type.value!=='3d'});
 assetPackSelect.disabled=type.value!=='3d';
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!state.playing&&hub.projectId){e.preventDefault();hide()}});
 document.querySelector('#hubCreate').onclick=()=>run(()=>createProject(name.value,type.value,assetPackSelect.value,genreSelect.value));
 document.querySelector('#hubLegacy').onclick=()=>run(importLegacyProject);
 document.querySelector('#hubOpen').onclick=show;
 document.querySelector('#hubClose').onclick=hide;
 document.querySelector('#hubSave').onclick=()=>{saveProject();updateTitle()};
 document.addEventListener('warlike:change',()=>{if(hub.projectId)updateTitle()});
 setInterval(()=>{if(!state.playing&&hub.projectId)saveProject()},2600);
 window.addEventListener('pagehide',()=>saveProject());
 modal.hidden=false;document.body.classList.add('hub-open');render();
}
