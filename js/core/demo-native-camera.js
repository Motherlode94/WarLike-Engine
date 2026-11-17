// Add the same real Camera components used by editor-created scenes to game demos.
// No duplicate renderer or synthetic game-system overrides.
import {defaultSceneCamera} from './scene-camera-3d.js';
import {defaultSceneCamera2d} from './scene-camera-2d.js';

export function ensureDemoGameCamera(scene,mode,{genre=scene?.genre}={}){
 if(!scene||!Array.isArray(scene.entities)||!['2d','3d'].includes(mode)||genre==='sandbox')return scene;
 // RTS battle cameras intentionally keep their dedicated high-level camera controllers.
 if(mode==='3d'&&['rts','company','battlefield'].includes(genre))return scene;
 const prop=mode==='3d'?'sceneCamera3d':'camera2d';
 if(scene.entities.some(o=>o[prop]))return scene;
 const actor=scene.entities.find(e=>e.id===scene.playerId)||
  scene.entities.find(e=>e.type==='player'||e.playable3d===true||e.controller2d);
 if(!actor)return scene;
 const id=Math.max(0,...scene.entities.map(o=>Number.isSafeInteger(o.id)?o.id:0))+1;
 const camera=mode==='3d'?{
  id,name:'Main Camera · '+(genre||'Démo'),type:'object',x:actor.x,y:actor.y,w:32,h:32,
  elevation3d:2,rotation:0,rotationX3d:0,color:'#8cc8ed',
  visible:false,collision3d:false,solid3d:false,editorHidden:false,
  hierarchyGroup:'Caméras',
  sceneCamera3d:{...defaultSceneCamera(),mode:actor.fpsController?'firstPerson':'thirdPerson',targetId:actor.id}
 }:{
  id,name:'Main Camera 2D · '+(genre||'Démo'),type:'object',x:actor.x,y:actor.y,w:32,h:24,
  color:'#8cc8ed',visible:false,solid2d:false,collision3d:false,
  hierarchyGroup:'Caméras',
  camera2d:{...defaultSceneCamera2d(),mode:'follow',targetId:actor.id,
   zoom:Number.isFinite(scene.camera?.zoom)?scene.camera.zoom:1}
 };
 scene.entities.push(camera);
 scene.nextId=Math.max(Number(scene.nextId)||0,id+1);
 return scene;
}
