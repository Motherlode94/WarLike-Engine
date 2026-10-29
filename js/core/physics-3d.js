import {createSpatialIndex3d} from './spatial-index-3d.js';
import {moveBody3d,activeBody3d,solidBody3d} from './collision-3d.js';
import {integrateNativeGravityBatch,overlapNative3d} from './native-3d.js';
// WarLike 3D lightweight rigidbody simulation on the horizontal x/y plane plus elevation.
// Intended for prototyping, not a substitute for an industrial physics engine.
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const defaultRigidbody3d=()=>({enabled:true,kinematic:false,lockRotations:true,ccd:true,mass:1,gravity:15,restitution:.2,friction:.82,vx:0,vz:0,vy:0});
export const bounds3d=o=>({x:finite(o.x),z:finite(o.y),y:finite(o.elevation3d),w:Math.max(1,finite(o.w,32)),d:Math.max(1,finite(o.depth3d,o.h||32)),h:Math.max(1,finite(o.h,32))});
export const overlap3d=(a,b)=>{
 const A=bounds3d(a),B=bounds3d(b);
 const accelerated=overlapNative3d(A,B);
 if(accelerated!==null)return accelerated;
 return A.x<B.x+B.w&&A.x+A.w>B.x&&A.z<B.z+B.d&&A.z+A.d>B.z&&A.y<B.y+B.h/64&&A.y+A.h/64>B.y;
};
// One swept solver is shared with walking, flight and vehicles.
export function stepPhysics3d(entities,dt){
 const frame=Math.min(.1,Math.max(0,finite(dt)));if(!frame)return;
 const bodies=entities.filter(o=>activeBody3d(o)&&o.rigidbody3d?.enabled&&!o.rigidbody3d.kinematic&&!o.playable3d&&o.type!=='player'&&!o.ai?.enabled),steps=Math.max(1,Math.ceil(frame/(1/120))),t=frame/steps;
 const dynamicSet=new Set(bodies),index=createSpatialIndex3d(entities,{filter:o=>!dynamicSet.has(o)&&solidBody3d(o)});
 for(let i=0;i<steps;i++){
  const batch=integrateNativeGravityBatch(bodies.map(o=>({y:Math.max(0,finite(o.elevation3d)),vy:finite(o.rigidbody3d.vy),gravity:Math.max(0,finite(o.rigidbody3d.gravity,15)),restitution:0})),t);
  for(let j=0;j<bodies.length;j++){
   const o=bodies[j],rb=o.rigidbody3d,bounce=Math.min(1,Math.max(0,finite(rb.restitution,.2))),gravity=Math.max(0,finite(rb.gravity,15));
   rb.vx=finite(rb.vx);rb.vz=finite(rb.vz);rb.vy=finite(rb.vy)-gravity*t;
   const initial=Math.max(0,finite(o.elevation3d)),proposal=batch?batch[j].y:initial+rb.vy*t;
   const dx=rb.vx*t,dy=rb.vz*t,swept={...o,x:Math.min(o.x,o.x+dx),y:Math.min(o.y,o.y+dy),w:Math.max(1,finite(o.w,32))+Math.abs(dx),depth3d:Math.max(1,finite(o.depth3d,o.h||32))+Math.abs(dy)},candidates=[...index.query(swept),...bodies];
   const contact=moveBody3d(o,dx,dy,(proposal-initial)*64,candidates);
   if(contact.blockedX)rb.vx=-rb.vx*bounce;if(contact.blockedY)rb.vz=-rb.vz*bounce;
   if(contact.blockedZ||contact.grounded&&rb.vy<0)rb.vy=Math.abs(rb.vy)<1?0:-rb.vy*bounce;
   o.grounded3d=contact.grounded;
   if(contact.grounded&&gravity>0){const drag=Math.pow(Math.min(1,Math.max(0,finite(rb.friction,.82))),t*60);rb.vx*=drag;rb.vz*=drag;if(Math.abs(rb.vx)<.0001)rb.vx=0;if(Math.abs(rb.vz)<.0001)rb.vz=0}
  }
 }
}
export function applyImpulse3d(o,x,y,z){
 const rb=o?.rigidbody3d;if(!rb?.enabled||rb.kinematic)return false;
 const mass=Math.max(.01,finite(rb.mass,1));
 rb.vx=finite(rb.vx)+finite(x)/mass;rb.vy=finite(rb.vy)+finite(y)/mass;rb.vz=finite(rb.vz)+finite(z)/mass;return true;
}
