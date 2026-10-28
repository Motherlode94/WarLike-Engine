import {resolveGameGenre} from './game-genres.js';
// Serializable game configuration, shared by the Hub, Blueprint and exported builds.
export const freshGameProject=()=>({version:1,id:'untitled',title:'Mon jeu',genre:'sandbox',activeSceneId:'main',startupSceneId:'main',scenes:[],variables:[],uiSkin:'kenney-blue'});
export const gameProject=freshGameProject();
const clone=value=>structuredClone(value);
export const safeKey=key=>typeof key==='string'&&key.length>0&&key.length<=80&&!['__proto__','prototype','constructor'].includes(key);
export function validEntities(entities){
 if(!Array.isArray(entities)||entities.length>10000)return false;
 const ids=new Set();
 return entities.every(o=>o&&Number.isSafeInteger(o.id)&&o.id>0&&!ids.has(o.id)&&ids.add(o.id)&&
  ['x','y','w','h'].every(k=>Number.isFinite(o[k]))&&o.w>0&&o.h>0);
}
export function restoreGameProject(value,{entities=null,genre=null}={}){
 const next=freshGameProject();
 if(value&&typeof value==='object'){
  for(const key of ['id','activeSceneId','startupSceneId'])if(safeKey(value[key]))next[key]=value[key];
  if(['classic','kenney-blue','kenney-grey'].includes(value.uiSkin))next.uiSkin=value.uiSkin;
  if(typeof value.title==='string')next.title=value.title.slice(0,120);
  if(Array.isArray(value.scenes))next.scenes=value.scenes.filter(s=>s&&safeKey(s.id)&&validEntities(s.entities)).slice(0,40).map(s=>({id:s.id,name:String(s.name||s.id).slice(0,80),entities:clone(s.entities),camera:clone(s.camera||{x:0,y:0,zoom:1})}));
  next.scenes=next.scenes.filter((s,i,a)=>a.findIndex(other=>other.id===s.id)===i);
  if(Array.isArray(value.variables))next.variables=value.variables.filter(v=>v&&safeKey(v.name)&&['number','string','boolean','vector2','vector3'].includes(v.type)).slice(0,128).map(clone);
 }
 next.genre=resolveGameGenre(value?.genre??genre,entities||next.scenes.find(s=>s.id===next.activeSceneId)?.entities||[]);
 Object.assign(gameProject,next);return gameProject;
}
export function captureGameScene(entities,camera,{id=gameProject.activeSceneId,name=id}={}){
 if(!safeKey(id)||!validEntities(entities))throw Error('La scène ou son identifiant est invalide.');
 const scene={id,name:String(name||id).slice(0,80),entities:clone(entities),camera:clone(camera||{x:0,y:0,zoom:1})};
 const index=gameProject.scenes.findIndex(s=>s.id===id);
 if(index<0){if(gameProject.scenes.length>=40)throw Error('40 scènes maximum par projet.');gameProject.scenes.push(scene)}else gameProject.scenes[index]=scene;
 gameProject.activeSceneId=id;return scene;
}
export function sceneDefinition(id){return gameProject.scenes.find(scene=>scene.id===id)||null}
