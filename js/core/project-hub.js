import {prefab3d} from '../assets/catalog-3d.js';
import {resetHistory} from './history.js';
// WarLike Hub — local named projects, independent 2D/3D templates.
// Storage stays on this browser. Export JSON to transfer projects to another device.
import {workspace,restoreWorkspaces,workspacePayload} from './workspaces.js';
import {state,notify} from './state.js';
import {stopSources} from './audio-sources.js';
const INDEX='warlike.hub.projects.v1',PREFIX='warlike.hub.project.';
const defaults2d=()=>[{id:1,name:'Player',type:'player',x:100,y:110,w:38,h:38,color:'#41cdb5'}];
const defaults3d=()=>[{...prefab3d('character-hero',1,150,150),name:'3D Player',playable3d:true}];
const entry=entities=>({entities,selected:[1],nextId:2,camera:{x:0,y:0,zoom:1}});
const safeRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const indexed=()=>safeRead(INDEX,[]).filter(p=>p&&typeof p.id==='string');
const uniqueId=()=>Date.now().toString(36)+'-'+Math.floor(Math.random()*1e8).toString(36);
export const hub={projectId:null,projectName:'Sans titre',type:'2d'};
export const listProjects=()=>indexed().sort((a,b)=>(b.updated||0)-(a.updated||0));
const assertName=name=>{const n=String(name||'').trim().slice(0,64);if(!n)throw Error('Choisis un nom de projet.');return n};
function saveMeta(meta){const all=indexed().filter(p=>p.id!==meta.id);all.unshift(meta);localStorage.setItem(INDEX,JSON.stringify(all))}
export function saveProject(){
 if(!hub.projectId||state.playing)return false;
 const data={version:5,...workspacePayload(),entities:state.entities,camera:state.camera,name:hub.projectName,type:hub.type};
 try{localStorage.setItem(PREFIX+hub.projectId,JSON.stringify(data));saveMeta({id:hub.projectId,name:hub.projectName,type:hub.type,updated:Date.now()});return true}catch{return false}
}
export function createProject(name,type){
 if(state.playing)throw Error('Arrête Play avant de créer un projet.');
 if(hub.projectId)saveProject();
 name=assertName(name);if(!['2d','3d'].includes(type))throw Error('Type de projet invalide.');
 const id=uniqueId(),data={workspaceMode:type,workspaces:{'2d':entry(defaults2d()),'3d':entry(defaults3d())}};
 if(!restoreWorkspaces(data))throw Error('Impossible de créer le projet.');
 Object.assign(hub,{projectId:id,projectName:name,type});state.demoGuide='';resetHistory();saveProject();notify();return id;
}
export function openProject(id){
 if(state.playing)throw Error('Arrête Play avant de changer de projet.');
 if(hub.projectId&&hub.projectId!==id)saveProject();
 const data=safeRead(PREFIX+id,null),meta=indexed().find(p=>p.id===id);
 if(!data||!meta||!restoreWorkspaces(data))throw Error('Projet introuvable ou corrompu.');
 Object.assign(hub,{projectId:id,projectName:meta.name,type:meta.type});state.keys.clear();state.demoGuide='';resetHistory();notify();return true;
}
export function deleteProject(id){
 if(state.playing)throw Error('Arrête Play avant de supprimer.');
 localStorage.removeItem(PREFIX+id);localStorage.setItem(INDEX,JSON.stringify(indexed().filter(p=>p.id!==id)));
 if(hub.projectId===id)Object.assign(hub,{projectId:null,projectName:'Sans titre',type:'2d'});
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
 const modal=document.querySelector('#hubOverlay'),cards=document.querySelector('#hubProjects'),name=document.querySelector('#hubProjectName'),type=document.querySelector('#hubProjectType'),message=document.querySelector('#hubMessage');
 const title=document.querySelector('#studioProjectName');
 let wasPlaying=false;
 const updateTitle=()=>{title.textContent=hub.projectName+(hub.projectId?' · '+hub.type.toUpperCase():'')};
 const hide=()=>{modal.hidden=true;document.body.classList.remove('hub-open');document.dispatchEvent(new Event('warlike:project'));updateTitle()};
 const show=()=>{if(state.playing)return;saveProject();modal.hidden=false;document.body.classList.add('hub-open');render();message.textContent=''};
 const run=cb=>{try{cb();hide()}catch(e){message.textContent=e.message}};
 function render(){
  cards.replaceChildren();
  for(const p of listProjects()){
   const item=document.createElement('div');item.className='hub-project-card';
   const info=document.createElement('div');const heading=document.createElement('strong');heading.textContent=p.name;
   const detail=document.createElement('small');detail.textContent=p.type.toUpperCase()+' · '+new Date(p.updated).toLocaleString();
   info.append(heading,detail);
   const open=document.createElement('button');open.textContent='Ouvrir';open.onclick=()=>run(()=>openProject(p.id));
   const edit=document.createElement('button');edit.textContent='Renommer';edit.title='Renommer ce projet';edit.onclick=()=>{const next=prompt('Nouveau nom du projet',p.name);if(next!==null){try{renameProject(p.id,next);render()}catch(e){message.textContent=e.message}}};
   const del=document.createElement('button');del.textContent='×';del.title='Supprimer ce projet local';del.onclick=()=>{if(confirm('Supprimer définitivement le projet « '+p.name+' » ?')){deleteProject(p.id);render()}};
   item.append(info,open,edit,del);cards.append(item);
  }
  document.querySelector('#hubLegacy').hidden=!safeRead('warlike.scene.v1',null)?.entities;
 }
 document.querySelector('#hubCreate').onclick=()=>run(()=>createProject(name.value,type.value));
 document.querySelector('#hubLegacy').onclick=()=>run(importLegacyProject);
 document.querySelector('#hubOpen').onclick=show;
 document.querySelector('#hubClose').onclick=hide;
 document.querySelector('#hubSave').onclick=()=>{saveProject();updateTitle()};
 document.addEventListener('warlike:change',()=>{if(hub.projectId)updateTitle()});
 setInterval(()=>{if(!state.playing&&hub.projectId)saveProject()},2600);
 window.addEventListener('pagehide',()=>saveProject());
 modal.hidden=false;document.body.classList.add('hub-open');render();
}
