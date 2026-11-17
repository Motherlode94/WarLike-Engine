// Camera component shared by WarLike Engine Play and WarLike Editor.
// Legacy scenes without a Camera use their existing orbit/FPS camera logic.
import {cameraPose} from './play-camera.js';

export const defaultSceneCamera=()=>({
 enabled:true,priority:0,mode:'fixed',targetId:0,
 fieldOfView:60,nearClip:.1,farClip:1000,
 clearFlags:'skybox',depth:0
});

export function activeSceneCamera(entities){
 return (entities||[]).filter(e=>e?.sceneCamera3d?.enabled!==false&&e?.sceneCamera3d&&e.enabled!==false)
  .sort((a,b)=>(Number(b.sceneCamera3d.priority)||0)-(Number(a.sceneCamera3d.priority)||0)||a.id-b.id)[0]||null;
}
export function sceneCameraView(camera,entities,{yaw=0,pitch=0}={}){
 if(!camera?.sceneCamera3d)return null;
 const settings=camera.sceneCamera3d;
 const position=[(Number(camera.x)||0)/64,(Number(camera.elevation3d)||0),(Number(camera.y)||0)/64];
 let target=null;
 if(settings.mode==='follow'||settings.mode==='firstPerson'){
  const targetObject=(entities||[]).find(e=>e.id===settings.targetId)||
   (entities||[]).find(e=>e.playable3d===true||e.type==='player');
  if(targetObject)target=[
   (Number(targetObject.x)||0)/64+(Number(targetObject.w)||0)/128,
   (Number(targetObject.elevation3d)||0)+(Number(targetObject.h)||0)*(settings.mode==='firstPerson'?.85:.5)/64,
   (Number(targetObject.y)||0)/64+(Number(targetObject.depth3d??targetObject.h)||0)/128
  ];
 }
 if(target&&settings.mode==='firstPerson'){
  position.splice(0,3,target[0],target[1],target[2]);
  target=[position[0]-Math.sin(yaw)*Math.cos(pitch),position[1]-Math.sin(pitch),position[2]-Math.cos(yaw)*Math.cos(pitch)];
 }
 if(target&&settings.mode==='follow')position.splice(0,3,...target.map((n,i)=>n+[(Number(camera.x)||0)/64,(Number(camera.elevation3d)||0),(Number(camera.y)||0)/64][i]));
 if(!target){
  const yaw=(Number(camera.rotation)||0)*Math.PI/180;
  const pitch=(Number(camera.rotationX3d)||0)*Math.PI/180;
  target=[position[0]-Math.sin(yaw)*Math.cos(pitch),position[1]-Math.sin(pitch),position[2]-Math.cos(yaw)*Math.cos(pitch)];
 }
 if(Math.hypot(...target.map((n,i)=>n-position[i]))<1e-5)return null;
 const pose=cameraPose(target,position);
 return {...pose,fieldOfView:Math.max(20,Math.min(120,Number(settings.fieldOfView)||60)),
 nearClip:Math.max(.01,Math.min(10,Number(settings.nearClip)||.1)),
 farClip:Math.max(20,Math.min(10000,Number(settings.farClip)||1000))};
}
export function cameraMovementYaw(view){
 if(!view)return null;
 return Math.atan2(-view.forward[0],-view.forward[2]);
}
