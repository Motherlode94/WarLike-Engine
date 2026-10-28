import {gameProject,safeKey,validEntities,sceneDefinition} from './game-project.js';
const clone=value=>structuredClone(value);
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const freshSession=()=>({phase:'playing',elapsed:0,currentSceneId:gameProject.activeSceneId,objectives:{},timers:{},dialogue:null,checkpoint:null,pending:null,notice:'',revision:0});
export const gameSession=freshSession();
export function resetGameSession(){Object.assign(gameSession,freshSession())}
export const gameIsRunning=()=>gameSession.phase==='playing';
export function setGamePhase(phase,message=''){
 if(!['playing','paused','won','lost'].includes(phase))return false;
 gameSession.phase=phase;gameSession.notice=String(message).slice(0,240);gameSession.revision++;return true;
}
export function setObjective(id,label,total=1){
 if(!safeKey(id))return false;
 gameSession.objectives[id]={id,label:String(label||id).slice(0,160),current:0,total:Math.max(1,finite(total,1)),status:'active'};gameSession.revision++;return true;
}
export function advanceObjective(id,amount=1){
 const o=gameSession.objectives[id];if(!o||o.status!=='active')return false;
 o.current=Math.max(0,Math.min(o.total,o.current+finite(amount,1)));if(o.current>=o.total)o.status='complete';gameSession.revision++;return true;
}
export function completeObjective(id){const o=gameSession.objectives[id];if(!o)return false;o.current=o.total;o.status='complete';gameSession.revision++;return true}
export function startTimer(id,duration){if(!safeKey(id))return false;gameSession.timers[id]={remaining:Math.max(0,Math.min(86400,finite(duration,10))),expired:false};return true}
export function tickGameSession(dt){
 const events=[];if(!gameIsRunning())return events;
 const frame=Math.max(0,Math.min(.1,finite(dt)));gameSession.elapsed+=frame;
 for(const [id,timer] of Object.entries(gameSession.timers))if(!timer.expired){timer.remaining=Math.max(0,timer.remaining-frame);if(timer.remaining<=1e-9){timer.remaining=0;timer.expired=true;events.push('timer:'+id)}}
 return events;
}
function storageFor(ctx){try{return ctx.storage??globalThis.localStorage}catch{throw Error('Le stockage des sauvegardes est indisponible.')}}
function saveKey(slot){if(!safeKey(slot))throw Error('Nom de sauvegarde invalide.');return 'warlike.save.v1:'+encodeURIComponent(gameProject.id)+':'+slot}
export function captureGameSave(ctx){
 if(!validEntities(ctx.entities))throw Error('La scène ne peut pas être sauvegardée.');
 return {format:'warlike.save.v1',projectId:gameProject.id,sceneId:gameSession.currentSceneId,
  entities:clone(ctx.entities),globals:clone(ctx.globals||{}),fired:[...(ctx.fired||[])],
  session:clone({phase:gameSession.phase,elapsed:gameSession.elapsed,objectives:gameSession.objectives,timers:gameSession.timers})};
}
export function validateGameSave(data,{checkpoint=false}={}){
 if(data?.format!=='warlike.save.v1'||data.projectId!==gameProject.id||!validEntities(data.entities))throw Error('Sauvegarde incompatible avec ce jeu.');
 if(!data.globals||typeof data.globals!=='object'||Array.isArray(data.globals)||!data.session||typeof data.session!=='object')throw Error('Données de sauvegarde invalides.');
 for(const key of Object.keys(data.globals))if(!safeKey(key))throw Error('Variable de sauvegarde invalide.');
 for(const collection of ['objectives','timers']){
  const record=data.session[collection];if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).length>256)throw Error('Progression invalide.');
  for(const [key,value] of Object.entries(record))if(!safeKey(key)||!value||typeof value!=='object'||Array.isArray(value))throw Error('Progression invalide.');
 }
 for(const objective of Object.values(data.session.objectives))if(!Number.isFinite(objective.current)||!Number.isFinite(objective.total)||objective.total<=0||objective.current<0||objective.current>objective.total||!['active','complete'].includes(objective.status))throw Error('Objectif de sauvegarde invalide.');
 for(const timer of Object.values(data.session.timers))if(!Number.isFinite(timer.remaining)||timer.remaining<0||typeof timer.expired!=='boolean')throw Error('Chronomètre de sauvegarde invalide.');
 if(!Number.isFinite(data.session.elapsed)||data.session.elapsed<0)throw Error('Durée de partie invalide.');
 if(!Array.isArray(data.fired)||data.fired.length>20000||data.fired.some(key=>typeof key!=='string'&&!Number.isSafeInteger(key)))throw Error('État des déclencheurs invalide.');
 if(data.checkpoint!=null){if(checkpoint)throw Error('Checkpoints imbriqués invalides.');validateGameSave(data.checkpoint,{checkpoint:true})}
 return data;
}
export function saveGameSlot(ctx,slot='quick'){
 const storage=storageFor(ctx);if(!storage?.setItem)throw Error('Le stockage des sauvegardes est indisponible.');
 const json=JSON.stringify({...captureGameSave(ctx),checkpoint:clone(gameSession.checkpoint)});if(json.length>8*1024*1024)throw Error('Sauvegarde trop volumineuse.');
 try{storage.setItem(saveKey(slot),json)}catch{throw Error('Impossible de sauvegarder : le stockage est indisponible ou plein.')}
 gameSession.notice='Partie sauvegardée';gameSession.revision++;return true;
}
export function readGameSlot(ctx,slot='quick'){
 const json=storageFor(ctx)?.getItem(saveKey(slot));if(!json)throw Error('Aucune sauvegarde dans cet emplacement.');
 if(json.length>8*1024*1024)throw Error('Sauvegarde trop volumineuse.');
 return validateGameSave(JSON.parse(json));
}
export function hasGameSlot(ctx,slot='quick'){try{readGameSlot(ctx,slot);return true}catch{return false}}
export function queueLoadGame(ctx,slot='quick'){gameSession.pending={kind:'restore',data:readGameSlot(ctx,slot)};return true}
export function queueScene(id){if(!sceneDefinition(id))throw Error('Scène introuvable : '+id);gameSession.pending={kind:'scene',id};return true}
export function applySessionChange(ctx){
 const pending=gameSession.pending;if(!pending)return null;gameSession.pending=null;
 if(pending.kind==='scene'){
  const scene=sceneDefinition(pending.id);if(!scene)throw Error('La scène demandée a disparu.');
  ctx.entities.splice(0,ctx.entities.length,...clone(scene.entities));gameSession.currentSceneId=scene.id;
  gameSession.phase='playing';gameSession.dialogue=null;gameSession.revision++;return {kind:'scene',camera:clone(scene.camera)};
 }
 const data=validateGameSave(pending.data);
 ctx.entities.splice(0,ctx.entities.length,...clone(data.entities));
 for(const key of Object.keys(ctx.globals))delete ctx.globals[key];Object.assign(ctx.globals,clone(data.globals));
 Object.assign(gameSession,{elapsed:data.session.elapsed,objectives:clone(data.session.objectives),timers:clone(data.session.timers),checkpoint:Object.hasOwn(data,'checkpoint')?clone(data.checkpoint):gameSession.checkpoint,phase:'playing',currentSceneId:data.sceneId,pending:null,dialogue:null,revision:gameSession.revision+1});
 return {kind:'restore',fired:data.fired};
}
