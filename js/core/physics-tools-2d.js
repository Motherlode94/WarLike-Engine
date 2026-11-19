import {colliderShape2d,colliderSeparation2d} from './collider-shapes-2d.js';
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultEffector2d=()=>({enabled:true,forceX:0,forceY:-980,drag:0,layerMask:4294967295});
export const defaultJoint2d=()=>({enabled:true,kind:'distance',targetId:0,anchorX:0,anchorY:0,offsetX:0,offsetY:0,distance:80,stiffness:60,damping:8});
const dynamic=o=>o?.enabled!==false&&!o?._sequenceDestroyed&&o?.rigidbody2d?.enabled&&(!o.rigidbody2d.bodyType||o.rigidbody2d.bodyType==='dynamic');
export function jointAnchor2d(owner,entities){
 const joint=owner.joint2d;
 if(!joint||joint.enabled===false)return null;
 if(num(joint.targetId)>0){
  const target=entities.find(o=>o.id===num(joint.targetId)&&o!==owner&&o.enabled!==false&&!o._sequenceDestroyed);
  if(!target)return null;
  const shape=colliderShape2d(target);
  return {x:shape.cx+num(joint.anchorX),y:shape.cy+num(joint.anchorY),vx:num(target.rigidbody2d?.vx),vy:num(target.rigidbody2d?.vy)};
 }
 return {x:num(joint.anchorX),y:num(joint.anchorY),vx:0,vy:0};
}
export function applyPhysicsTools2d(owner,entities,dt){
 if(!dynamic(owner))return;
 const rb=owner.rigidbody2d,mass=Math.max(.01,num(rb.mass,1)),shape=colliderShape2d(owner);
 for(const area of entities){
  const effect=area.effector2d;
  if(area===owner||area.enabled===false||area._sequenceDestroyed||!effect||effect.enabled===false||area.collider2d?.enabled===false)continue;
  const mask=Number.isInteger(effect.layerMask)?effect.layerMask>>>0:4294967295,layer=clamp(Math.trunc(num(owner.collider2d?.layer)),0,31);
  if(!(mask&(1<<layer))||colliderSeparation2d(shape,colliderShape2d(area))>=0)continue;
  rb.vx+=clamp(num(effect.forceX),-1000000,1000000)/mass*dt;
  rb.vy+=clamp(num(effect.forceY),-1000000,1000000)/mass*dt;
  const drag=Math.exp(-clamp(num(effect.drag),0,1000)*dt);rb.vx*=drag;rb.vy*=drag;
 }
 const joint=owner.joint2d,anchor=jointAnchor2d(owner,entities);
 if(!anchor||joint.kind!=='spring')return;
 const dx=shape.cx+num(joint.offsetX)-anchor.x,dy=shape.cy+num(joint.offsetY)-anchor.y,length=Math.hypot(dx,dy);
 if(length<1e-7)return;
 const radial=((rb.vx-anchor.vx)*dx+(rb.vy-anchor.vy)*dy)/length;
 const force=clamp(-clamp(num(joint.stiffness,60),0,10000)*(length-clamp(num(joint.distance,80),0,100000))-clamp(num(joint.damping,8),0,1000)*radial,-1000000,1000000);
 rb.vx+=force*dx/length/mass*dt;rb.vy+=force*dy/length/mass*dt;
}
// One-way distance constraint: the target is an anchor, never an implicit
// second simulated body. Collision-safe correction leaves blocked joints in
// error rather than moving a body through a wall to satisfy the constraint.
export function solveJoint2d(owner,entities,move){
 const joint=owner.joint2d,anchor=jointAnchor2d(owner,entities);
 if(!dynamic(owner)||!anchor||joint.kind!=='distance')return;
 const shape=colliderShape2d(owner),dx=shape.cx+num(joint.offsetX)-anchor.x,dy=shape.cy+num(joint.offsetY)-anchor.y,length=Math.hypot(dx,dy);
 const distance=clamp(num(joint.distance,80),0,100000);
 if(length<1e-7)return;
 const nx=dx/length,ny=dy/length;
 move(owner,nx*(distance-length),ny*(distance-length),entities);
 const rb=owner.rigidbody2d,radial=(rb.vx-anchor.vx)*nx+(rb.vy-anchor.vy)*ny;
 rb.vx-=radial*nx;rb.vy-=radial*ny;
}
export function physicsDiagnostics2d(entities){
 const report={bodies:0,colliders:0,triggers:0,joints:0,effectors:0,warnings:[]};
 for(const o of entities){
  if(o.enabled===false||o._sequenceDestroyed)continue;
  if(o.collider2d?.enabled!==false&&o.collider2d){report.colliders++;if(o.collider2d.isTrigger)report.triggers++;if(o.collider2d.shape&&!['box','circle','capsule'].includes(o.collider2d.shape))report.warnings.push('#'+o.id+' : forme inconnue, rectangle utilisé.');}
  if(o.rigidbody2d?.enabled){report.bodies++;if(!Number.isFinite(o.rigidbody2d.mass)||o.rigidbody2d.mass<=0)report.warnings.push('#'+o.id+' : masse invalide.');}
  if(o.effector2d?.enabled!==false&&o.effector2d){report.effectors++;if(!o.collider2d?.isTrigger)report.warnings.push('#'+o.id+' : utiliser un Trigger pour traverser la zone de forces.');}
  if(o.joint2d?.enabled!==false&&o.joint2d){report.joints++;if(!dynamic(o))report.warnings.push('#'+o.id+' : articulation sans Rigidbody dynamique.');if(!jointAnchor2d(o,entities))report.warnings.push('#'+o.id+' : cible d’articulation absente.');if(!['distance','spring'].includes(o.joint2d.kind))report.warnings.push('#'+o.id+' : type d’articulation inconnu.');}
 }
 return report;
}
