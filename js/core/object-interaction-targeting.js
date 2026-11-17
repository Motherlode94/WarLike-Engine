// Shared object targeting for 2D proximity and 3D camera aiming.
// Pure selection only: input, gameplay events and physics manipulation remain runtime responsibilities.
import {activeBody3d,raycastScene3d} from './collision-3d.js';
import {interactionCenter,interactionBlocked} from './interaction-range.js';

export function isObjectInteractable(entity) {
  const c=entity?.interactable;
  return !!c&&c.enabled!==false&&entity.visible!==false&&activeBody3d(entity);
}

export function selectObjectInteraction(actor,entities,{
  mode='3d',origin=null,direction=null,maxDistance=3,
}={}) {
  if(!actor||!Array.isArray(entities)||!Number.isFinite(maxDistance)||maxDistance<=0)return null;
  const candidates=entities.filter(e=>e!==actor&&isObjectInteractable(e));
  if(!candidates.length)return null;
  if(mode==='3d'&&Array.isArray(origin)&&Array.isArray(direction)) {
    const hit=raycastScene3d(origin,direction,entities,{
      exclude:actor,maxDistance,
      target:isObjectInteractable,
    });
    if(!hit||!isObjectInteractable(hit.entity))return null;
    const limit=Number(hit.entity.interactable.maxDistance);
    if(Number.isFinite(limit)&&limit>0&&hit.distance>Math.min(limit,maxDistance))return null;
    return {entity:hit.entity,distance:hit.distance,point:hit.point};
  }
  if(mode!=='2d'&&mode!=='3d')return null;
  const a=interactionCenter(actor,mode);
  const targets=candidates.map(entity=>{
    const b=interactionCenter(entity,mode);
    const distance=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)/64;
    const limit=Number(entity.interactable.maxDistance);
    return {entity,distance,limit:Number.isFinite(limit)&&limit>0?Math.min(limit,maxDistance):maxDistance};
  }).filter(hit=>hit.distance<=hit.limit&&!interactionBlocked(actor,hit.entity,entities,mode));
  targets.sort((a,b)=>a.distance-b.distance||String(a.entity.id).localeCompare(String(b.entity.id)));
  return targets.length?{entity:targets[0].entity,distance:targets[0].distance,point:null}:null;
}
