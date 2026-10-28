// Shared ground-plane perception for AI, combat and Blueprint conditions.
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
export const healthOf=entity=>finite(entity?.stats?.health??entity?.hp,100);
export const factionOf=entity=>String(entity?.aiFaction||(entity?.team??entity?.threatIntel?.faction??'neutral'));
const hasFaction=entity=>!!entity?.aiFaction||entity?.team!=null||!!entity?.threatIntel?.faction;
export function sameFaction(a,b){return !!a&&!!b&&hasFaction(a)&&hasFaction(b)&&factionOf(a)===factionOf(b)}
export function isHostileTo(actor,target,player=target){
 if(!actor||!target||actor===target||sameFaction(actor,target))return false;
 const relation=actor.threatIntel?.relation;
 if(target===player&&relation)return relation==='hostile'||relation==='suspicious';
 // Legacy enemies remain hostile to the player. NPC-vs-NPC combat requires
 // explicit factions or a Blueprint target and still protects same-faction actors.
 return target===player||actor.aiTargetId===target.id||(hasFaction(actor)&&hasFaction(target)&&factionOf(actor)!=='neutral'&&factionOf(target)!=='neutral');
}
export function isAiObstacle(entity,actor,target){
 return entity!==actor&&entity!==target&&entity.collision3d!==false&&
  entity.sequenceEnabled!==false&&!entity._sequenceDestroyed&&!entity._hiddenInVehicle&&
  !entity.lightType&&!entity.audioEnabled&&!entity.ai&&!entity.playable3d&&entity.type!=='player'&&entity.type!=='character'&&
  (entity.solid3d===true||entity.type==='object'||entity.type==='mesh3d');
}
export function hasLineOfSight(actor,target,entities){
 if(!actor||!target)return false;
 const x0=finite(actor.x)+finite(actor.w)*.5,y0=finite(actor.y)+finite(actor.depth3d,finite(actor.h))*.5;
 const x1=finite(target.x)+finite(target.w)*.5,y1=finite(target.y)+finite(target.depth3d,finite(target.h))*.5;
 return !entities.some(obstacle=>{
  if(!isAiObstacle(obstacle,actor,target))return false;
  let near=0,far=1;
  for(const [start,delta,min,max] of [
   [x0,x1-x0,finite(obstacle.x),finite(obstacle.x)+finite(obstacle.w)],
   [y0,y1-y0,finite(obstacle.y),finite(obstacle.y)+finite(obstacle.depth3d,finite(obstacle.h))]
  ]){
   if(Math.abs(delta)<1e-8){if(start<min||start>max)return false;continue}
   const a=(min-start)/delta,b=(max-start)/delta;
   near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
   if(near>far)return false;
  }
  return near<1&&far>0;
 });
}
export function perceiveTarget(actor,target,entities){
 const ai=actor.ai||{},dx=finite(target?.x)-finite(actor.x),dy=finite(target?.y)-finite(actor.y);
 const distance=Math.hypot(dx,dy),inRange=!!target&&distance<=Math.max(0,finite(ai.detection,450));
 const fov=Math.max(0,Math.min(360,finite(ai.fieldOfView,360)));
 // 0 degrees faces +X, 90 degrees faces +Y (ground Z in the 3D workspace).
 const facing=finite(actor.rotation)*Math.PI/180;
 const inView=distance<.001||fov>=360||(dx*Math.cos(facing)+dy*Math.sin(facing))/distance>=Math.cos(fov*Math.PI/360);
 const lineOfSight=inRange&&hasLineOfSight(actor,target,entities);
 return {distance,visible:inRange&&inView&&lineOfSight,
  detected:inRange&&inView&&(ai.requireLineOfSight!==true||lineOfSight)};
}
