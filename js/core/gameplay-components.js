import {cameraFacingDegrees} from './character-facing.js';
import {findEnginePath as findPath} from './native-3d.js';
import {healthOf,isHostileTo,isAiObstacle,hasLineOfSight,perceiveTarget} from './ai-perception.js';
// Configurable gameplay components. Positions use WarLike's existing 2D ground coordinates.
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultStats=()=>({maxHealth:100,health:100,maxStamina:100,stamina:100,staminaRegen:14});
export const defaultInventory=()=>({capacity:16,items:[],equipment:{weapon:null,armor:null}});
export const defaultAi=()=>({enabled:true,state:'idle',detection:450,attackRange:65,attackDamage:8,attackCooldown:1.2,speed:75,homeX:null,homeY:null,patrolRadius:130,pathfinding:true,requireLineOfSight:false,fieldOfView:360,memoryDuration:4,searchDuration:2,pathCellSize:48,repathInterval:.75});
export const defaultController=()=>({walkSpeed:4.2,sprintSpeed:7,jumpForce:5.6,gravity:15,dodgeDistance:1.8,dodgeCooldown:.8,staminaCost:20});
export function ensureStats(o){o.stats??={...defaultStats(),maxHealth:Math.max(100,healthOf(o)),health:Math.max(0,healthOf(o))};return o.stats}
export function ensureAi(o){o.ai={...defaultAi(),...o.ai};return o.ai}
export function setHealth(o,value){const s=ensureStats(o);s.health=clamp(n(value),0,Math.max(1,n(s.maxHealth,100)));o.hp=s.health;return s.health}
export function inventoryCount(o,id){const inv=o?.inventory;if(!inv||!id)return 0;return Math.max(0,n(Array.isArray(inv.items)?inv.items.find(item=>item.id===id)?.count:inv[id]??inv.items?.[id]))}
export function inventoryAdd(o,id,count=1){o.inventory??=defaultInventory();const inv=o.inventory;count=Math.floor(n(count));if(!id||count<=0)return false;const existing=inv.items.find(i=>i.id===id);if(!existing&&inv.items.length>=Math.max(1,n(inv.capacity,16)))return false;if(existing)existing.count+=count;else inv.items.push({id,count});return true}
export function inventoryRemove(o,id,count=1){const item=o.inventory?.items?.find(i=>i.id===id);count=Math.floor(n(count));if(!item||count<=0||item.count<count)return false;item.count-=count;if(item.count===0){o.inventory.items=o.inventory.items.filter(i=>i!==item);for(const slot of Object.keys(o.inventory.equipment||{}))if(o.inventory.equipment[slot]===id)o.inventory.equipment[slot]=null}return true}
export function equipItem(o,id,slot='weapon'){if(!o.inventory?.items?.some(i=>i.id===id&&i.count>0)||!['weapon','armor'].includes(slot))return false;o.inventory.equipment??={weapon:null,armor:null};o.inventory.equipment[slot]=id;return true}
export function damage(o,amount){return setHealth(o,healthOf(o)-Math.max(0,n(amount)))}
export function updateStats(entities,dt){for(const o of entities){if(!o.stats)continue;const s=o.stats;s.stamina=clamp(n(s.stamina)+Math.max(0,n(s.staminaRegen,14))*dt,0,Math.max(1,n(s.maxStamina,100)));}}
export function updateAi(entities,player,dt){
 const frame=Math.max(0,Math.min(.5,n(dt)));
 for(const e of entities){
  const ai=e.ai;
  if(!ai?.enabled||e===player)continue;
  ai.visible=false;ai.detected=false;
  ai.cooldown=Math.max(0,n(ai.cooldown)-frame);
  if(healthOf(e)<=0){ai.state='dead';ai.targetId=null;ai.awareness=0;e.animation='dead';continue}
  if(e.sequenceEnabled===false||e._sequenceDestroyed){ai.targetId=null;ai.memoryRemaining=0;ai.searchRemaining=0;continue}
  ai.homeX??=e.x;ai.homeY??=e.y;
  ai.clock=n(ai.clock)+frame;
  // A Blueprint target is authoritative; a missing/dead target must never
  // silently redirect attacks to the player. Null restores automatic targeting.
  const explicit=e.aiTargetId!=null&&n(e.aiTargetId)>0;
  const candidate=explicit?entities.find(target=>target.id===n(e.aiTargetId)):player;
  const target=candidate&&healthOf(candidate)>0&&candidate.sequenceEnabled!==false&&
   !candidate._sequenceDestroyed&&isHostileTo(e,candidate,player)?candidate:null;
  if(ai._candidateId!==(target?.id??null)){ai.path=null;ai.repathTimer=0;ai.memoryRemaining=0;ai.searchRemaining=0}
  ai._candidateId=target?.id??null;
  const perception=perceiveTarget(e,target,entities);
  ai.visible=!!target&&perception.visible;
  ai.detected=!!target&&perception.detected;
  const attackRange=Math.max(0,n(ai.attackRange,65));
  const previous=ai.state;
  let tx=null,ty=null;
  if(ai.detected){
   ai.lastKnownX=target.x;ai.lastKnownY=target.y;
   ai.memoryRemaining=Math.max(0,n(ai.memoryDuration,4));
   ai.searchRemaining=Math.max(0,n(ai.searchDuration,2));
   ai.awareness=1;
   ai.state=perception.distance<=attackRange?'attack':'chase';
   tx=target.x;ty=target.y;
  }else if(target&&(n(ai.memoryRemaining)>0||n(ai.searchRemaining)>0)){
   ai.memoryRemaining=Math.max(0,n(ai.memoryRemaining)-frame);
   ai.awareness=clamp(n(ai.memoryRemaining)/Math.max(.001,n(ai.memoryDuration,4)),0,1);
   tx=ai.lastKnownX;ty=ai.lastKnownY;
   const reached=Math.hypot(n(tx)-e.x,n(ty)-e.y)<=Math.max(8,n(ai.speed,75)*frame);
   if(!reached&&ai.memoryRemaining>0)ai.state='investigate';
   else{
    ai.state='search';tx=null;ty=null;
    ai.searchRemaining=Math.max(0,n(ai.searchRemaining)-frame);
    if(ai.searchRemaining===0){ai.memoryRemaining=0;ai.awareness=0;ai.state='return'}
   }
  }else{
   ai.awareness=0;
   const away=Math.hypot(ai.homeX-e.x,ai.homeY-e.y)>8;
   ai.state=away&&['chase','attack','investigate','search','return'].includes(previous)?'return':'patrol';
  }
  ai.targetId=ai.detected||n(ai.memoryRemaining)>0||n(ai.searchRemaining)>0?target?.id??null:null;
  if(ai.state==='return'){tx=ai.homeX;ty=ai.homeY}
  if(ai.state==='patrol'){
   const radius=Math.max(0,n(ai.patrolRadius,130)),phase=ai.clock*.65+n(e.id);
   tx=ai.homeX+Math.sin(phase)*radius;ty=ai.homeY+Math.cos(phase)*radius;
  }
  const step=Math.min(2000,Math.max(0,n(ai.speed,75)))*frame;
  if(tx!=null&&ty!=null&&ai.state!=='attack'){
   const obstacles=entities.filter(other=>isAiObstacle(other,e,target));
   if(ai.pathfinding!==false&&ai.state!=='patrol'){
    ai.repathTimer=n(ai.repathTimer)-frame;
    if(ai.repathTimer<=0||!Array.isArray(ai.path)||previous!==ai.state){
     // Navigation takes body origins; perception uses ground footprints.
     ai.path=findPath({x:e.x,y:e.y},{x:tx,y:ty},obstacles.map(o=>({...o,h:o.depth3d??o.h})),
      {cellSize:Math.max(24,n(ai.pathCellSize,48)),padding:Math.max(n(e.w),n(e.depth3d,e.h))*.35,maxNodes:1200});
     ai.repathTimer=Math.max(.2,n(ai.repathInterval,.75));
    }
    while(ai.path?.length&&Math.hypot(ai.path[0].x-e.x,ai.path[0].y-e.y)<Math.max(8,step*1.5))ai.path.shift();
    if(ai.path?.length){tx=ai.path[0].x;ty=ai.path[0].y}
   }
   const dx=tx-e.x,dy=ty-e.y,length=Math.hypot(dx,dy);
   if(length>2){
    const ux=dx/length,uy=dy/length,distanceStep=Math.min(step,length);
    // Substeps prevent fast AI tunnelling through thin walls.
    const count=Math.max(1,Math.ceil(distanceStep/Math.max(4,Math.min(n(e.w,32),n(e.depth3d,e.h||32))*.3)));
    for(let i=0;i<count;i++)for(const [cx,cy] of [[ux,uy],[ux,0],[0,uy],[-uy,ux],[uy,-ux]]){
     if(!cx&&!cy)continue;
     const x=e.x+cx*distanceStep/count,y=e.y+cy*distanceStep/count;
     if(!obstacles.some(o=>x<o.x+o.w&&x+n(e.w,32)>o.x&&y<o.y+n(o.depth3d,o.h)&&y+n(e.depth3d,e.h||32)>o.y)){
      e.x=x;e.y=y;e.rotation=Math.atan2(cy,cx)*180/Math.PI;break;
     }
    }
   }
   e.animation=ai.state==='chase'?'run':'walk';
  }else e.animation=ai.state==='attack'?'attack':'idle';
  if(ai.state==='attack'&&target&&ai.cooldown===0&&hasLineOfSight(e,target,entities)){
   damage(target,n(ai.attackDamage,8));ai.cooldown=Math.max(.1,n(ai.attackCooldown,1.2));
  }
 }
}
export function attack3d(attacker,entities,{range=120,damageAmount=20,arc=1.2}={}){
 const target=entities.filter(e=>e.ai?.enabled&&isHostileTo(e,attacker,attacker)&&healthOf(e)>0&&
  e.sequenceEnabled!==false&&hasLineOfSight(attacker,e,entities))
  .sort((a,b)=>Math.hypot(a.x-attacker.x,a.y-attacker.y)-Math.hypot(b.x-attacker.x,b.y-attacker.y))[0];
 if(!target||Math.hypot(target.x-attacker.x,target.y-attacker.y)>Math.max(0,n(range,120)))return null;
 damage(target,Math.max(0,n(damageAmount,20)));target.animation='hurt';return target;
}
// 3D movement is camera-relative: forward must point where the camera looks,
// not toward the orbit camera position. x/y here are WarLike's ground X/Z.
export function cameraRelativeWalk3d(right,forward,yaw){
 const length=Math.hypot(right,forward);
 if(!length)return {x:0,z:0,length:0};
 const x=(right*Math.cos(yaw)-forward*Math.sin(yaw))/length;
 const z=(-right*Math.sin(yaw)-forward*Math.cos(yaw))/length;
 return {x,z,length};
}
export function updateController3d(p,keys,dt,yaw,entities){
 const cfg=p.controller3d||defaultController(),stats=ensureStats(p);
 const frame=Math.max(0,Math.min(.1,n(dt)));
 if(!frame)return;
 const ax=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'));
 const az=Number(keys.has('w')||keys.has('z')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
 const len=Math.hypot(ax,az),sprint=keys.has('shift')&&stats.stamina>0;
 const jump=keys.has(' ')||keys.has('space');
 const solid=o=>o!==p&&o.collision3d!==false&&!o.lightType&&!o.audioEnabled&&(o.solid3d===true||o.type==='object'||o.type==='mesh3d');
 const radiusX=Math.max(1,n(p.w,32)),radiusZ=Math.max(1,n(p.depth3d,p.h||32)),height=Math.max(.1,n(p.h,100)/64);
 const top=o=>n(o.elevation3d)+Math.max(.1,n(o.h,32)/64);
 const overlapsXZ=(x,z,o)=>x<n(o.x)+n(o.w,32)&&x+radiusX>n(o.x)&&z<n(o.y)+n(o.depth3d,o.h||32)&&z+radiusZ>n(o.y);
 const horizontalBlocked=(x,z,elevation)=>entities.some(o=>solid(o)&&overlapsXZ(x,z,o)&&elevation<top(o)-.0001&&elevation+height>n(o.elevation3d)+.0001);
 const floorAt=(x,z,current)=>entities.reduce((floor,o)=>{
  if(!solid(o)||!overlapsXZ(x,z,o))return floor;
  const candidate=top(o);
  return candidate<=current+.03&&candidate>floor?candidate:floor;
 },0);
 p.elevation3d=Math.max(0,n(p.elevation3d));
 p._verticalVelocity=n(p._verticalVelocity);
 p._dodgeTimer=Math.max(0,n(p._dodgeTimer)-frame);
 const dodgeDown=keys.has('control');
 if(dodgeDown&&!p._dodgeHeld&&p._dodgeTimer<=0&&len&&stats.stamina>=n(cfg.staminaCost,20)){
  p._dodgeTimer=Math.max(.1,n(cfg.dodgeCooldown,.8));
  p._dodgeBoost=Math.max(0,n(cfg.dodgeDistance,1.8))*64/.18;
  stats.stamina=Math.max(0,stats.stamina-n(cfg.staminaCost,20));
 }
 p._dodgeHeld=dodgeDown;
 const dodge=p._dodgeBoost&&p._dodgeTimer>Math.max(0,n(cfg.dodgeCooldown,.8))-.18?p._dodgeBoost:0;
 const movement=cameraRelativeWalk3d(ax,az,yaw);
 const velocity=Math.max(0,n(sprint?cfg.sprintSpeed:cfg.walkSpeed,4.2))*64+dodge;
 const vx=movement.x*velocity;
 const vz=movement.z*velocity;
 if(Number.isFinite(yaw))p.rotation=cameraFacingDegrees(yaw);
 if(len&&sprint)stats.stamina=clamp(stats.stamina-18*frame,0,n(stats.maxStamina,100));
 const grounded=p.elevation3d<=floorAt(p.x,p.y,p.elevation3d)+.035&&p._verticalVelocity<=0;
 if(jump&&!p._jumpHeld&&grounded){p._verticalVelocity=Math.max(0,n(cfg.jumpForce,5.6));p.grounded3d=false}
 p._jumpHeld=jump;
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(vx),Math.abs(vz))*frame/Math.max(4,Math.min(radiusX,radiusZ)*.3)),Math.ceil(frame/(1/90)));
 const t=frame/steps,stepHeight=Math.max(0,Math.min(.6,n(cfg.stepHeight,.28))),gravity=Math.max(0,n(cfg.gravity,15));
 for(let step=0;step<steps;step++){
  const oldFloor=floorAt(p.x,p.y,p.elevation3d);
  const wasGrounded=p.elevation3d<=oldFloor+.035&&p._verticalVelocity<=0;
  for(const [axis,delta] of [['x',vx*t],['y',vz*t]]){
   if(!delta)continue;
   const candidate=p[axis]+delta;
   const x=axis==='x'?candidate:p.x,z=axis==='y'?candidate:p.y;
   if(!horizontalBlocked(x,z,p.elevation3d)){p[axis]=candidate;continue}
   // Grounded characters can step onto low obstacles, but cannot phase through walls.
   if(wasGrounded&&p._verticalVelocity<=0){
    const raised=p.elevation3d+stepHeight;
    if(!horizontalBlocked(x,z,raised)){
     p[axis]=candidate;
     const support=floorAt(x,z,raised);
     p.elevation3d=Math.max(p.elevation3d,support);
    }
   }
  }
  const oldHeight=p.elevation3d;
  p._verticalVelocity-=gravity*t;
  const candidate=Math.max(0,oldHeight+p._verticalVelocity*t);
  const floor=entities.reduce((value,o)=>{
   if(!solid(o)||!overlapsXZ(p.x,p.y,o))return value;
   const level=top(o);
   return level<=oldHeight+.035&&level>=candidate-.001?Math.max(value,level):value;
  },0);
  if(p._verticalVelocity<=0&&candidate<=floor){p.elevation3d=floor;p._verticalVelocity=0}
  else if(p._verticalVelocity>0&&entities.some(o=>solid(o)&&overlapsXZ(p.x,p.y,o)&&oldHeight+height<=n(o.elevation3d)+.01&&candidate+height>n(o.elevation3d))){p._verticalVelocity=0}
  else p.elevation3d=candidate;
 }
 const support=floorAt(p.x,p.y,p.elevation3d+.04);
 p.grounded3d=p.elevation3d<=support+.035&&p._verticalVelocity<=0;
 p.animation=p.grounded3d?(len?(sprint?'run':'walk'):'idle'):(p._verticalVelocity>0?'jump':'fall');
}
