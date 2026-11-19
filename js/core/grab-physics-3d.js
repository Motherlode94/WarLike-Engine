// Native 3D pickup loop for the same Rigidbody/Collider used by Play and Web export.
// Coordinates: horizontal x/y in scene pixels, vertical elevation3d in metres.
import {activeBody3d,raycastScene3d,moveBody3d} from './collision-3d.js';
import {applyImpulse3d} from './physics-3d.js';

const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const defaultGrab3d=()=>({enabled:true,maxDistance:3,holdDistance:1.8,throwSpeed:8});
export const createGrabSession3d=()=>({heldId:null,previousKinematic:null});
// Stop has already restored authored objects. Discard only the runtime handle;
// releasing against those restored IDs would overwrite their saved velocities.
export const discardGrabSession3d=session=>{if(session){session.heldId=null;session.previousKinematic=null}};
export function canGrab3d(entity){
 return !!entity?.grab3d&&entity.grab3d.enabled!==false
  &&entity.enabled!==false&&entity.visible!==false&&!entity._sequenceDestroyed
  &&entity.collision3d!==false&&entity.collider3d?.enabled!==false
  &&entity.rigidbody3d?.enabled===true&&!entity.rigidbody3d.kinematic
  &&activeBody3d(entity);
}
const center=o=>[
 finite(o.x)/64+finite(o.w,32)/128,
 finite(o.elevation3d)+finite(o.h,32)/128,
 finite(o.y)/64+finite(o.depth3d,o.h||32)/128
];
const unit=v=>{if(!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite))return null;const length=Math.hypot(...v);return length>1e-7?v.map(n=>n/length):null;};
export function releaseGrab3d(session,entities,{direction=null,throwObject=false,onEvent=null}={}){
 if(!session||session.heldId==null)return null;
 const target=entities?.find(e=>e.id===session.heldId);
 session.heldId=null;
 if(!target){session.previousKinematic=null;return null;}
 const rb=target.rigidbody3d;
 if(rb){rb.kinematic=session.previousKinematic===true;rb.vx=0;rb.vy=0;rb.vz=0;}
 session.previousKinematic=null;
 const speed=clamp(finite(target.grab3d?.throwSpeed,8),0,30),heading=unit(direction);
 if(throwObject&&rb&&!rb.kinematic&&heading&&speed>0){
  const mass=Math.max(.01,finite(rb.mass,1));
  applyImpulse3d(target,heading[0]*speed*mass*64,heading[1]*speed*mass,heading[2]*speed*mass*64);
 }
 onEvent?.(throwObject&&heading?'throw':'drop',target);
 return target;
}
export function tickGrab3d(session,{actor=null,entities=[],origin=null,direction=null,pressedKeys=new Set(),dt=1/60,blocked=false,onEvent=null}={}){
 if(!session||!Array.isArray(entities))return null;
 const heading=unit(direction);
 const target=session.heldId==null?null:entities.find(o=>o.id===session.heldId);
 if(session.heldId!=null&&(!actor||!target||target.enabled===false||target.grab3d?.enabled===false||target.rigidbody3d?.enabled!==true||blocked)){
  releaseGrab3d(session,entities,{onEvent});return null;
 }
 if(blocked||!actor||!heading||!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isFinite))return target;
 if(target&&(pressedKeys.has('t')||pressedKeys.has('g'))){
  releaseGrab3d(session,entities,{direction:heading,throwObject:pressedKeys.has('t'),onEvent});return null;
 }
 if(!target&&pressedKeys.has('g')){
  const maxDistance=8;
  const hit=raycastScene3d(origin,heading,entities,{exclude:actor,maxDistance,target:canGrab3d});
  if(!hit||!canGrab3d(hit.entity))return null;
  const object=hit.entity,range=clamp(finite(object.grab3d.maxDistance,3),.2,maxDistance);
  if(hit.distance>range)return null;
  session.heldId=object.id;
  session.previousKinematic=object.rigidbody3d.kinematic===true;
  object.rigidbody3d.kinematic=true;
  object.rigidbody3d.vx=0;object.rigidbody3d.vy=0;object.rigidbody3d.vz=0;
  onEvent?.('grab',object);
 }
 const held=entities.find(o=>o.id===session.heldId);
 if(!held)return null;
 const desiredDistance=clamp(finite(held.grab3d?.holdDistance,1.8),.5,3.5);
 const destination=origin.map((n,i)=>n+heading[i]*desiredDistance);
 const position=center(held);
 const delta=destination.map((n,i)=>n-position[i]);
 const amount=clamp(Math.hypot(...delta),0,clamp(finite(dt,1/60),0,.1)*16);
 if(amount>0&&delta.some(n=>n)){
  const n=delta.map(v=>v/Math.hypot(...delta)*amount);
  moveBody3d(held,n[0]*64,n[2]*64,n[1]*64,entities,{ignore:actor,recover:false});
 }
 return held;
}
