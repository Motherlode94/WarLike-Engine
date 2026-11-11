// Pure camera math shared by the play viewport and regression tests.
import {colliderGeometry3d,colliderPosition3d,rotationQuaternion3d} from './collider-3d.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const cameraDamping=(sharpness,dt)=>1-Math.exp(-Math.max(0,sharpness)*Math.max(0,dt));
export const defaultCameraRig=()=>({mode:'thirdPerson',distance:4.8,height:.72,followSharpness:10,sensitivity:.0026,collision:true});
export function cameraRigFor(actor,vehicle=false){
 const source=actor?.cameraRig||{},base=defaultCameraRig();
 return {mode:actor?.fpsController?'firstPerson':['thirdPerson','firstPerson','orbit'].includes(source.mode)?source.mode:base.mode,
 distance:clamp(Number(source.distance)|| (vehicle?7.5:base.distance),1.2,24),height:clamp(Number.isFinite(source.height)?source.height:base.height,.1,1.5),followSharpness:clamp(Number(source.followSharpness)||base.followSharpness,1,30),sensitivity:clamp(Number(source.sensitivity)||base.sensitivity,.0005,.02),collision:source.collision!==false};
}
export function cameraTargetFor(bounds,rig){return [bounds.x,bounds.y-bounds.h/2+bounds.h*rig.height,bounds.z]}
// Exact ray versus oriented BoxCollider. Other shapes use conservative bounds.
// A quaternion is used rather than Euler-only yaw so tilted walls and ceilings
// do not clip the third-person camera.
const rotate=(point,q)=>{
 const t=[2*(q.y*point[2]-q.z*point[1]),2*(q.z*point[0]-q.x*point[2]),2*(q.x*point[1]-q.y*point[0])];
 return [point[0]+q.w*t[0]+q.y*t[2]-q.z*t[1],
         point[1]+q.w*t[1]+q.z*t[0]-q.x*t[2],
         point[2]+q.w*t[2]+q.x*t[1]-q.y*t[0]];
};
const validBox=box=>box&&[box.x,box.y,box.z,box.w,box.h,box.d].every(Number.isFinite)&&box.w>0&&box.h>0&&box.d>0;
export function cameraObstacleForEntity(entity){
 const g=colliderGeometry3d(entity),p=colliderPosition3d(entity,g),q=rotationQuaternion3d(entity);
 const offset=rotate([g.offset.x,g.offset.y,g.offset.z],q);
 return {x:p.x+offset[0],y:p.y+offset[1],z:p.z+offset[2],w:g.w,h:g.h,d:g.d,
  ...(g.shape==='box'?{quaternion:q}:{})};
}
// Returns the maximum unobstructed fraction of the desired camera boom.
// The legacy AABB object format remains valid for saved projects and plugins.
export function cameraBoomFraction(target,eye,obstacles,padding=.18){
 const delta=eye.map((n,i)=>n-target[i]),length=Math.hypot(...delta);
 if(length<1e-8)return 1;
 let fraction=1;
 for(const box of obstacles){
  if(!validBox(box))continue;
  const center=[box.x,box.y,box.z],size=[box.w,box.h,box.d];
  const q=box.quaternion,rotationValid=q&&[q.x,q.y,q.z,q.w].every(Number.isFinite);
  const inverse=rotationValid?{x:-q.x,y:-q.y,z:-q.z,w:q.w}:null;
  const localTarget=inverse?rotate(target.map((v,i)=>v-center[i]),inverse):target.map((v,i)=>v-center[i]);
  const localEye=inverse?rotate(eye.map((v,i)=>v-center[i]),inverse):eye.map((v,i)=>v-center[i]);
  const localDelta=localEye.map((v,i)=>v-localTarget[i]);
  // A collider containing the tracked actor is not a useful camera obstacle.
  if(localTarget.every((v,i)=>Math.abs(v)<size[i]/2+padding))continue;
  let enter=0,exit=1,hit=true;
  for(let axis=0;axis<3;axis++){
   const low=-size[axis]/2-padding,high=size[axis]/2+padding;
   if(Math.abs(localDelta[axis])<1e-8){
    if(localTarget[axis]<low||localTarget[axis]>high){hit=false;break}
    continue;
   }
   let a=(low-localTarget[axis])/localDelta[axis],b=(high-localTarget[axis])/localDelta[axis];
   if(a>b)[a,b]=[b,a];
   enter=Math.max(enter,a);exit=Math.min(exit,b);
   if(enter>exit){hit=false;break}
  }
  if(hit&&enter>=0&&enter<1)fraction=Math.min(fraction,Math.max(0,enter-.015/length));
 }
 return fraction;
}
export function cameraPose(target,eye){
 const norm=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const forward=norm(target.map((n,i)=>n-eye[i])),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));return {eye,forward,right,up};
}
export function followCamera2d(camera,player,viewport,dt,{snap=false}={}){
 const zoom=camera.zoom||1,targetX=viewport.width/2-(player.x+player.w/2)*zoom,targetY=viewport.height/2-(player.y+player.h/2)*zoom;
 const factor=snap?1:cameraDamping(Number(player.cameraRig?.followSharpness)||9,dt);
 return {...camera,x:camera.x+(targetX-camera.x)*factor,y:camera.y+(targetY-camera.y)*factor};
}

// Contract immediately at contact, then restore distance smoothly when space clears.
export function resolveCameraBoom(target,desiredEye,obstacles,{previousDistance=null,dt=0,sharpness=8,padding=.18}={}){
 const length=Math.hypot(...desiredEye.map((v,i)=>v-target[i]));if(length<1e-8)return {eye:target.slice(),distance:0};
 const allowed=length*cameraBoomFraction(target,desiredEye,obstacles,padding),prior=Number.isFinite(previousDistance)?Math.max(0,previousDistance):allowed;
 const distance=allowed<=prior?allowed:Math.min(allowed,prior+(allowed-prior)*cameraDamping(sharpness,dt));
 return {eye:desiredEye.map((v,i)=>target[i]+(v-target[i])*distance/length),distance};
}
