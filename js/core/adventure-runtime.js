import {activeBody3d} from './collision-3d.js';
import {healthOf} from './ai-perception.js';
import {interactionCenter,interactionBlocked} from './interaction-range.js';
export const adventureView={journalOpen:false};
export function adventureTarget(actor,entities,{mode='2d'}={}){
 if(!actor?.adventure||healthOf(actor)<=0)return null;
 const a=interactionCenter(actor,mode);
 return entities.filter(o=>o!==actor&&o.adventureInteractable?.enabled!==false&&o.adventureInteractable&&o.visible!==false&&activeBody3d(o)).map(o=>{
  const b=interactionCenter(o,mode);return {entity:o,distance:Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)};
 }).filter(({entity,distance})=>distance<=Math.max(24,Math.min(220,Number(entity.adventureInteractable.radius)||150))&&!interactionBlocked(actor,entity,entities,mode)).sort((a,b)=>a.distance-b.distance||a.entity.id-b.entity.id)[0]?.entity||null;
}
