// Independent 2D/3D workspaces. Each keeps its own scene, selection and camera.
// Switching cannot happen during Play; callers stop simulation before switching.
import {state,notify} from './state.js';
export const workspace={mode:'2d',scenes:{
 '2d':{entities:null,selected:null,nextId:1,camera:null},
 '3d':{entities:[{id:1,name:'3D Player',type:'character',skin:'scout',animation:'idle',x:150,y:150,w:45,h:78,elevation3d:0,color:'#41cdb5'}],selected:[1],nextId:2,camera:{x:0,y:0,zoom:1}}
}};
const clone=v=>structuredClone(v);
export function captureWorkspace(){
 const slot=workspace.scenes[workspace.mode];
 Object.assign(slot,{entities:clone(state.entities),selected:clone(state.selected),nextId:state.nextId,camera:clone(state.camera)});
}
export function switchWorkspace(mode){
 if(!['2d','3d'].includes(mode))return false;
 if(state.playing)return false;
 if(workspace.mode===mode)return true;
 captureWorkspace();const slot=workspace.scenes[mode];
 workspace.mode=mode;
 state.entities=clone(slot.entities||[]);state.selected=clone(slot.selected||[]);
 state.nextId=slot.nextId||1;state.camera=clone(slot.camera||{x:0,y:0,zoom:1});
 notify();return true;
}
export function workspacePayload(){
 captureWorkspace();
 return {workspaceMode:workspace.mode,workspaces:clone(workspace.scenes)};
}
export function restoreWorkspaces(data){
 if(!data?.workspaces?.['2d']||!data.workspaces?.['3d'])return false;
 for(const key of ['2d','3d']){
  const slot=data.workspaces[key];
  if(!Array.isArray(slot.entities)||!Array.isArray(slot.selected))return false;
  workspace.scenes[key]={entities:clone(slot.entities),selected:clone(slot.selected),nextId:slot.nextId||1,camera:clone(slot.camera||{x:0,y:0,zoom:1})};
 }
 workspace.mode=data.workspaceMode==='3d'?'3d':'2d';
 const slot=workspace.scenes[workspace.mode];state.entities=clone(slot.entities);state.selected=clone(slot.selected);state.nextId=slot.nextId;state.camera=clone(slot.camera);
 notify();return true;
}
