// Native Camera component: mouse yaw/pitch are shared by first- and third-person play.
// A scene without a Camera continues to use WarLike's existing legacy camera rig.
import {cameraPose} from './play-camera.js';

export const defaultSceneCamera=()=>({
 enabled:true,priority:0,mode:'thirdPerson',targetId:0,
 distance:4.8,height:1.5,shoulderOffset:0,
 fieldOfView:60,nearClip:.1,farClip:1000,
 clearFlags:'skybox',depth:0
});
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const rad=Math.PI/180;
export function activeSceneCamera(entities){
 return (entities||[])
  .filter(e=>e?.sceneCamera3d?.enabled!==false&&e?.sceneCamera3d&&e.enabled!==false)
  .sort((a,b)=>(finite(b.sceneCamera3d.priority,0)-finite(a.sceneCamera3d.priority,0))||a.id-b.id)[0]||null;
}
export function cameraTargetEntity(camera,entities){
 if(!camera?.sceneCamera3d)return null;
 const id=Number(camera.sceneCamera3d.targetId);
 return (entities||[]).find(e=>e!==camera&&id>0&&e.id===id)||
  (entities||[]).find(e=>e!==camera&&(e.playable3d===true||e.type==='player'))||null;
}
export function sceneCameraView(camera,entities,{yaw=0,pitch=0}={}){
 if(!camera?.sceneCamera3d)return null;
 const settings=camera.sceneCamera3d;
 // Both FPS and TPS share the same look vector and therefore movement heading.
 const safeYaw=finite(yaw,0),safePitch=clamp(finite(pitch,0),-1.48,1.48);
 const forward=[
  -Math.sin(safeYaw)*Math.cos(safePitch),
  -Math.sin(safePitch),
  -Math.cos(safeYaw)*Math.cos(safePitch)
 ];
 const position=[finite(camera.x,0)/64,finite(camera.elevation3d,0),finite(camera.y,0)/64];
 let target=null;
 const mode=settings.mode==='follow'?'thirdPerson':settings.mode; // migration alias
 // Preserve the input heading independently of camera pitch, boom height and shoulder offset.
 // The rendered look vector still points from the real camera eye to its target.
 if(['firstPerson','thirdPerson'].includes(mode)){
  const actor=cameraTargetEntity(camera,entities);
  if(actor){
   const center=[
    finite(actor.x,0)/64+finite(actor.w,0)/128,
    finite(actor.elevation3d,0)+finite(actor.h,0)/64*(mode==='firstPerson'?.85:.65),
    finite(actor.y,0)/64+finite(actor.depth3d??actor.h,0)/128
   ];
   if(mode==='firstPerson'){
    position.splice(0,3,...center);
    target=center.map((n,i)=>n+forward[i]);
   }else{
    // Orbit around the target: mouse yaw rotates the boom as well as look.
    const distance=clamp(finite(settings.distance,4.8),.3,40);
    const height=clamp(finite(settings.height,1.5),-5,12);
    const shoulder=clamp(finite(settings.shoulderOffset,0),-3,3);
    const right=[Math.cos(safeYaw),0,-Math.sin(safeYaw)];
    const eye=center.map((n,i)=>n-forward[i]*distance+right[i]*shoulder);
    eye[1]+=height;
    position.splice(0,3,...eye);
    target=center;
   }
  }
 }
 if(!target){
  const fixedYaw=finite(camera.rotation,0)*rad;
  const fixedPitch=finite(camera.rotationX3d,0)*rad;
  target=[
   position[0]-Math.sin(fixedYaw)*Math.cos(fixedPitch),
   position[1]-Math.sin(fixedPitch),
   position[2]-Math.cos(fixedYaw)*Math.cos(fixedPitch)
  ];
 }
 if(Math.hypot(...target.map((n,i)=>n-position[i]))<1e-5)return null;
 const pose=cameraPose(target,position);
 return {...pose,
  headingYaw:['firstPerson','thirdPerson'].includes(mode)?safeYaw:null,
  fieldOfView:clamp(finite(settings.fieldOfView,60),20,120),
  nearClip:clamp(finite(settings.nearClip,.1),.01,10),
  farClip:clamp(finite(settings.farClip,1000),20,10000)};
}
export function cameraMovementYaw(view){
 if(!view)return null;
 if(Number.isFinite(view.headingYaw))return view.headingYaw;
 return Math.atan2(-view.forward[0],-view.forward[2]);
}
