import {createSpatialIndex3d} from './spatial-index-3d.js';
import {integrateNativeGravity,integrateNativeGravityBatch,overlapNative3d} from './native-3d.js';
// WarLike 3D lightweight rigidbody simulation on the horizontal x/y plane plus elevation.
// Intended for prototyping, not a substitute for an industrial physics engine.
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const defaultRigidbody3d=()=>({enabled:true,kinematic:false,mass:1,gravity:15,restitution:.2,friction:.82,vx:0,vz:0,vy:0});
export const bounds3d=o=>({x:finite(o.x),z:finite(o.y),y:finite(o.elevation3d),w:Math.max(1,finite(o.w,32)),d:Math.max(1,finite(o.depth3d,o.h||32)),h:Math.max(1,finite(o.h,32))});
export const overlap3d=(a,b)=>{
 const A=bounds3d(a),B=bounds3d(b);
 const accelerated=overlapNative3d(A,B);
 if(accelerated!==null)return accelerated;
 return A.x<B.x+B.w&&A.x+A.w>B.x&&A.z<B.z+B.d&&A.z+A.d>B.z&&A.y<B.y+B.h/64&&A.y+A.h/64>B.y;
};
// Resolve motion one axis at a time so contact along X does not erase valid Z travel.
export function stepPhysics3d(entities,dt){
 const frame=Math.min(.1,Math.max(0,finite(dt)));if(frame===0)return;
 const steps=Math.max(1,Math.ceil(frame/(1/120)));
 const t=frame/steps;
 const solid=(subject,other)=>other!==subject&&other.collision3d!==false&&(other.solid3d===true||other.type==='object'||other.type==='mesh3d');
 const isDynamic=o=>o.rigidbody3d?.enabled&&!o.rigidbody3d.kinematic&&!o.playable3d&&o.type!=='player'&&!o.ai?.enabled;
 const staticIndex=createSpatialIndex3d(entities,{filter:o=>!isDynamic(o)&&o.collision3d!==false});
 const dynamicBodies=entities.filter(isDynamic);
 for(let substep=0;substep<steps;substep++){
  const nativeInputs=dynamicBodies.map(o=>({
   y:Math.max(0,finite(o.elevation3d)),
   vy:finite(o.rigidbody3d.vy),
   gravity:Math.max(0,finite(o.rigidbody3d.gravity,15)),
   restitution:Math.min(1,Math.max(0,finite(o.rigidbody3d.restitution,.2)))
  }));
  const batch=integrateNativeGravityBatch(nativeInputs,t);
  for(let bodyIndex=0;bodyIndex<dynamicBodies.length;bodyIndex++){
   const o=dynamicBodies[bodyIndex];
  const rb=o.rigidbody3d;
  if(!rb?.enabled||rb.kinematic||o.playable3d||o.type==='player'||o.ai?.enabled)continue;
  const restitution=Math.min(1,Math.max(0,finite(rb.restitution,.2)));
  const friction=Math.min(1,Math.max(0,finite(rb.friction,.82)));
  rb.vx=finite(rb.vx);rb.vz=finite(rb.vz);rb.vy=finite(rb.vy);
  const position=axis=>finite(o[axis]);
  const collision=()=>[...staticIndex.query(o),...dynamicBodies].some(other=>solid(o,other)&&overlap3d(o,other));
  for(const [axis,velocity] of [['x','vx'],['y','vz']]){
   const initial=position(axis);
   o[axis]=initial+rb[velocity]*t;
   if(collision()){o[axis]=initial;rb[velocity]*=-restitution;}
  }
  // Elevation is world Y. Test it after horizontal contact resolution.
  const initialHeight=Math.max(0,finite(o.elevation3d));
  const gravity=Math.max(0,finite(rb.gravity,15));
  const integrated=batch?batch[bodyIndex]:integrateNativeGravity(initialHeight,rb.vy,gravity,restitution,t);
  let nextHeight=integrated?integrated.y:Math.max(0,initialHeight+(rb.vy-gravity*t)*t);
  let nextVy=integrated?integrated.vy:rb.vy-gravity*t;
  o.elevation3d=nextHeight;
  if(collision()){
   o.elevation3d=initialHeight;
   nextVy=nextVy>0?Math.min(0,-nextVy*restitution):Math.max(0,-nextVy*restitution);
  }else if(nextHeight===0&&!integrated){
   nextVy=Math.abs(nextVy)>1?-nextVy*restitution:0;
  }
  rb.vy=nextVy;
  if(o.elevation3d===0){
   const drag=Math.pow(friction,t*60);
   rb.vx*=drag;rb.vz*=drag;
   if(Math.abs(rb.vx)<.0001)rb.vx=0;
   if(Math.abs(rb.vz)<.0001)rb.vz=0;
  }
 }
 }
}
export function applyImpulse3d(o,x,y,z){
 const rb=o?.rigidbody3d;if(!rb?.enabled||rb.kinematic)return false;
 const mass=Math.max(.01,finite(rb.mass,1));
 rb.vx=finite(rb.vx)+finite(x)/mass;rb.vy=finite(rb.vy)+finite(y)/mass;rb.vz=finite(rb.vz)+finite(z)/mass;return true;
}
