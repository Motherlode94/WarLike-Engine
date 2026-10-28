import {moveBody3d,solidBody3d} from './collision-3d.js';
import {moveBody2d} from './physics-2d.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const heroCenter=(o,mode='2d')=>({x:n(o.x)+n(o.w,32)/2,y:n(o.y)+n(mode==='3d'?o.depth3d??o.h:o.h,32)/2,z:mode==='3d'?n(o.elevation3d)*64+n(o.h,64)*.55:0});
export const heroBox=(o,mode='2d')=>({x:n(o.x),y:n(o.y),z:mode==='3d'?n(o.elevation3d)*64:0,w:Math.max(1,n(o.w,32)),d:Math.max(1,n(mode==='3d'?o.depth3d??o.h:o.h,32)),h:mode==='3d'?Math.max(1,n(o.h,64)):1});
export const solidHero3d=solidBody3d;
/** Shared sweep, with a 60 m ceiling for superhero flight. */
export function moveHero3d(o,dx,dy,dz,entities){
 const before=[o.x,o.y,o.elevation3d||0];moveBody3d(o,dx,dy,dz,entities);o.elevation3d=Math.min(60,o.elevation3d);return before.some((v,i)=>v!==[o.x,o.y,o.elevation3d][i]);
}
export function moveHero(o,dx,dy,dz,entities,mode){if(mode==='3d')return moveHero3d(o,dx,dy,dz,entities);const x=o.x,y=o.y;moveBody2d(o,dx,dy,entities);return o.x!==x||o.y!==y}
export function heroFacing(o,mode='2d',yaw=null){
 if(mode==='3d'){const angle=Number.isFinite(yaw)?yaw:Math.PI-n(o.rotation)*Math.PI/180;return {x:-Math.sin(angle),y:-Math.cos(angle),z:0}}
 return {x:o.flipX?-1:1,y:0,z:0};
}
export function stepHeroFlight(o,keys,dt,entities,mode='3d',yaw=0){
 const speed=Math.max(.5,Math.min(30,n(o.superhero?.flightSpeed,6)))*64*(keys.has('shift')?1.5:1),frame=Math.max(0,Math.min(.1,n(dt)));
 const right=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'));
 const forward=Number(keys.has('w')||keys.has('z')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
 let x,y,z;
 if(mode==='3d'){x=right*Math.cos(yaw)-forward*Math.sin(yaw);y=-right*Math.sin(yaw)-forward*Math.cos(yaw);z=Number(keys.has(' '))-Number(keys.has('x'));o.rotation=((180-yaw*180/Math.PI)%360+360)%360;o._verticalVelocity=0;o.grounded3d=false}
 else{x=right;y=-forward-Number(keys.has(' '))+Number(keys.has('x'));z=0;if(o.rigidbody2d)o.rigidbody2d.vy=0;o.grounded2d=false;if(right)o.flipX=right<0}
 const length=Math.hypot(x,y,z);moveHero(o,x/(length||1)*speed*frame,y/(length||1)*speed*frame,z/(length||1)*speed*frame,entities,mode);o.animation=length>0?'fly':'idle';
}
/** First segment intersection, shared by energy bolts and beam occlusion. */
export function segmentBoxFraction(from,to,box,mode='3d',padding=0){
 let near=0,far=1;for(const [axis,size] of (mode==='3d'?[['x','w'],['y','d'],['z','h']]:[['x','w'],['y','d']])){
  const start=n(from[axis]),delta=n(to[axis])-start,min=box[axis]-padding,max=box[axis]+box[size]+padding;
  if(Math.abs(delta)<1e-8){if(start<min||start>max)return null;continue}
  const a=(min-start)/delta,b=(max-start)/delta;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;
 }return near>=0&&near<=1?near:null;
}
