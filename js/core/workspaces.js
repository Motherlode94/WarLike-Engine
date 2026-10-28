import {genreForMode} from './game-genres.js';
import {gameProject,restoreGameProject} from './game-project.js';
import {prefab3d} from '../assets/catalog-3d.js';
// Independent 2D/3D workspaces. Each keeps its own scene, selection and camera.
// Switching cannot happen during Play; callers stop simulation before switching.
import {state,notify} from './state.js';
export const workspace={mode:'2d',scenes:{
 '2d':{entities:null,selected:null,nextId:1,camera:null},
 '3d':{entities:[{...prefab3d('character-hero',1,150,150),name:'3D Player',playable3d:true}],selected:[1],nextId:2,camera:{x:0,y:0,zoom:1}}
}};
const clone=v=>structuredClone(v);
export function captureWorkspace(){
 const slot=workspace.scenes[workspace.mode];
 Object.assign(slot,{entities:clone(state.entities),selected:clone(state.selected),nextId:state.nextId,camera:clone(state.camera),game:clone(gameProject)});
}
export function switchWorkspace(mode){
 if(!['2d','3d'].includes(mode))return false;
 if(state.playing)return false;
 if(workspace.mode===mode)return true;
 captureWorkspace();state.keys.clear();const slot=workspace.scenes[mode];
 workspace.mode=mode;
 restoreGameProject(slot.game,{entities:slot.entities});gameProject.genre=genreForMode(gameProject.genre,mode);
 state.entities=clone(slot.entities||[]);state.selected=clone(slot.selected||[]);
 state.nextId=slot.nextId||1;state.camera=clone(slot.camera||{x:0,y:0,zoom:1});
 notify();return true;
}
export function workspacePayload(){
 captureWorkspace();
 return {workspaceMode:workspace.mode,workspaces:clone(workspace.scenes)};
}
export function restoreWorkspaces(data,retainCurrent=false){
 if(!data?.workspaces?.['2d']||!data.workspaces?.['3d'])return false;
 // Validate both scenes *before* changing live editor state.
 const next={};
 try{
  for(const key of ['2d','3d']){
   const slot=data.workspaces[key];
   if(!Array.isArray(slot.entities)||!Array.isArray(slot.selected)||slot.entities.length>20000)return false;
   const ids=new Set();
   for(const entity of slot.entities){
    if(!entity||typeof entity!=='object'||!Number.isSafeInteger(entity.id)||entity.id<0||ids.has(entity.id))return false;
    ids.add(entity.id);
   }
   const selected=slot.selected.filter(id=>ids.has(id));
   const nextId=Math.max(1,...slot.entities.map(e=>e.id+1));
   const camera=slot.camera||{x:0,y:0,zoom:1};
   if(!['x','y','zoom'].every(k=>Number.isFinite(camera[k]))||camera.zoom<=0)return false;
   next[key]={entities:clone(slot.entities),selected:clone(selected),nextId:Math.max(nextId,Number.isSafeInteger(slot.nextId)?slot.nextId:1),camera:clone(camera),game:clone(slot.game||null)};
  }
 }catch{return false}
 const mode=retainCurrent?workspace.mode:(data.workspaceMode==='3d'?'3d':'2d');
 workspace.scenes=next;workspace.mode=mode;
 const slot=next[mode];restoreGameProject(slot.game,{entities:slot.entities,genre:data.genre});gameProject.genre=genreForMode(gameProject.genre,mode);
 state.entities=clone(slot.entities);state.selected=clone(slot.selected);
 state.nextId=slot.nextId;state.camera=clone(slot.camera);
 notify();return true;
}
