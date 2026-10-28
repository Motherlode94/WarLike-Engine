import {activeBody3d,collisionBox3d,segmentBox3d,solidBody3d} from './collision-3d.js';
import {colliderRect2d,solidCollider2d} from './physics-2d.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const interactionCenter=(o,mode='2d')=>({x:n(o.x)+n(o.w)/2,y:n(o.y)+n(mode==='3d'?o.depth3d:o.h,n(o.h))/2,z:mode==='3d'?n(o.elevation3d)*64:0});
export function interactionBlocked(actor,node,entities,mode='2d'){
 const a=interactionCenter(actor,mode),b=interactionCenter(node,mode),from={...a,z:mode==='3d'?a.z+n(actor.h,64)*.5:.5},to={...b,z:mode==='3d'?b.z+n(node.h,32)*.5:.5};
 return entities.some(o=>{
  if(o===actor||o===node||!activeBody3d(o))return false;
  if(mode==='3d')return solidBody3d(o)&&segmentBox3d(from,to,collisionBox3d(o))!==null;
  if(!solidCollider2d(o))return false;const r=colliderRect2d(o);
  return segmentBox3d(from,to,{x:r.x,y:r.y,z:0,w:r.w,d:r.h,h:1})!==null;
 });
}
