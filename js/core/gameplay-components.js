import {moveBody3d,solidBody3d,supportBody3d} from './collision-3d.js';
import {damageSimulationNode} from './simulation-nodes.js';
import {skillRank,progressionDamageScale,awardExperience} from './rpg-progression.js';
import {stepHeroFlight} from './hero-movement.js';
import {cameraFacingDegrees} from './character-facing.js';
import {findEnginePath as findPath} from './native-3d.js';
import {healthOf,actorDistance,isHostileTo,isAiObstacle,hasLineOfSight,perceiveTarget} from './ai-perception.js';
// Configurable gameplay components. Positions use WarLike's existing 2D ground coordinates.
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultStats=()=>({maxHealth:100,health:100,maxStamina:100,stamina:100,staminaRegen:14});
export const defaultInventory=()=>({capacity:16,items:[],equipment:{weapon:null,armor:null}});
export const defaultAi=()=>({enabled:true,state:'idle',detection:450,attackRange:65,attackDamage:8,attackCooldown:1.2,speed:75,homeX:null,homeY:null,patrolRadius:130,pathfinding:true,requireLineOfSight:false,fieldOfView:360,memoryDuration:4,searchDuration:2,pathCellSize:48,repathInterval:.75});
export const defaultController=()=>({walkSpeed:4.2,sprintSpeed:7,jumpForce:5.6,gravity:15,dodgeDistance:1.8,dodgeCooldown:.8,staminaCost:20,stepHeight:.28,coyoteTime:.1,jumpBuffer:.12});
export function ensureStats(o){o.stats??={...defaultStats(),maxHealth:Math.max(100,healthOf(o)),health:Math.max(0,healthOf(o))};return o.stats}
export function ensureAi(o){o.ai={...defaultAi(),...o.ai};return o.ai}
export function setHealth(o,value){const s=ensureStats(o);s.health=clamp(n(value),0,Math.max(1,n(s.maxHealth,100)));o.hp=s.health;return s.health}
export function inventoryCount(o,id){const inv=o?.inventory;if(!inv||!id)return 0;return Math.max(0,n(Array.isArray(inv.items)?inv.items.find(item=>item.id===id)?.count:inv[id]??inv.items?.[id]))}
export function inventoryAdd(o,id,count=1){o.inventory??=defaultInventory();const inv=o.inventory;count=Math.floor(n(count));if(!id||count<=0)return false;const existing=inv.items.find(i=>i.id===id);if(!existing&&inv.items.length>=Math.max(1,n(inv.capacity,16)))return false;if(existing)existing.count+=count;else inv.items.push({id,count});return true}
export function inventoryRemove(o,id,count=1){const item=o.inventory?.items?.find(i=>i.id===id);count=Math.floor(n(count));if(!item||count<=0||item.count<count)return false;item.count-=count;if(item.count===0){o.inventory.items=o.inventory.items.filter(i=>i!==item);for(const slot of Object.keys(o.inventory.equipment||{}))if(o.inventory.equipment[slot]===id)o.inventory.equipment[slot]=null}return true}
export function equipItem(o,id,slot='weapon'){if(!o.inventory?.items?.some(i=>i.id===id&&i.count>0)||!['weapon','armor'].includes(slot))return false;o.inventory.equipment??={weapon:null,armor:null};o.inventory.equipment[slot]=id;return true}
export function damage(o,amount){let hit=Math.max(0,n(amount));const hero=o.heroState;if(hero?.invulnerable>0)return healthOf(o);if(hero?.shield>0){const absorbed=Math.min(hit,Math.max(0,n(hero.shield)));hero.shield-=absorbed;hit-=absorbed;o._heroShieldImpact=absorbed>0}hit*=1-skillRank(o,'guard')*.04;return setHealth(o,healthOf(o)-hit)}
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
 const target=entities.filter(e=>e!==attacker&&(e.simulationNode?.enabled&&e.simulationNode.kind==='destructible'&&e.simulationNode.health>0||e.ai?.enabled&&isHostileTo(e,attacker,attacker)&&healthOf(e)>0)&&
  e.sequenceEnabled!==false&&hasLineOfSight(attacker,e,entities))
  .sort((a,b)=>actorDistance(a,attacker)-actorDistance(b,attacker))[0];
 if(!target||actorDistance(target,attacker)>Math.max(0,n(range,120)))return null;
 const before=healthOf(target),amount=Math.max(0,n(damageAmount,20))*progressionDamageScale(attacker);if(target.simulationNode?.kind==='destructible')damageSimulationNode(target,amount,attacker,{mode:'3d'});else{damage(target,amount);if(before>0&&healthOf(target)<=0)awardExperience(attacker,40)}target.animation='hurt';return target;
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
export function updateController3d(p,keys,dt,yaw,entities,{pressedKeys=new Set()}={}){
 const cfg=p.controller3d||defaultController(),stats=ensureStats(p),frame=clamp(n(dt),0,.1);if(!frame)return;
 if(p.superhero?.enabled!==false&&p.heroState?.flight){delete p._support3d;stepHeroFlight(p,keys,frame,entities,'3d',yaw);return}
 // A moving support carries its passenger, while walls and ceilings still block it.
 const prior=p._support3d,support=prior&&entities.find(o=>o.id===prior.id&&solidBody3d(o));
 if(support&&p.grounded3d&&n(p._verticalVelocity)<=0){const dx=n(support.x)-prior.x,dy=n(support.y)-prior.y,dz=(n(support.elevation3d)-prior.z)*64;if(Math.hypot(dx,dy,dz)<256)moveBody3d(p,dx,dy,dz,entities,{ignore:support,recover:false})}
 moveBody3d(p,0,0,0,entities);
 const ax=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'));
 const az=Number(keys.has('w')||keys.has('z')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
 const len=Math.hypot(ax,az),sprint=keys.has('shift')&&stats.stamina>0,jump=keys.has(' ')||keys.has('space');
 p._verticalVelocity=n(p._verticalVelocity);p._dodgeTimer=Math.max(0,n(p._dodgeTimer)-frame);
 const dodgeDown=keys.has('control');
 if(dodgeDown&&!p._dodgeHeld&&p._dodgeTimer<=0&&len&&stats.stamina>=n(cfg.staminaCost,20)){p._dodgeTimer=Math.max(.1,n(cfg.dodgeCooldown,.8));p._dodgeBoost=Math.max(0,n(cfg.dodgeDistance,1.8))*64/.18;stats.stamina=Math.max(0,stats.stamina-n(cfg.staminaCost,20))}
 p._dodgeHeld=dodgeDown;
 const dodge=p._dodgeBoost&&p._dodgeTimer>Math.max(0,n(cfg.dodgeCooldown,.8))-.18?p._dodgeBoost:0,movement=cameraRelativeWalk3d(ax,az,yaw),speed=Math.max(0,n(sprint?cfg.sprintSpeed:cfg.walkSpeed,4.2))*64+dodge;
 if(Number.isFinite(yaw))p.rotation=cameraFacingDegrees(yaw);if(len&&sprint)stats.stamina=clamp(stats.stamina-18*frame,0,n(stats.maxStamina,100));
 const grounded=(p.elevation3d<=.0001||!!supportBody3d(p,entities))&&p._verticalVelocity<=0;
 p._coyote3d=grounded?clamp(n(cfg.coyoteTime,.1),0,.3):Math.max(0,n(p._coyote3d)-frame);
 p._jumpBuffer3d=Math.max(0,n(p._jumpBuffer3d)-frame);
 if(jump&&!p._jumpHeld||pressedKeys.has(' ')||pressedKeys.has('space'))p._jumpBuffer3d=Math.max(.001,clamp(n(cfg.jumpBuffer,.12),0,.3));p._jumpHeld=jump;
 if(p._jumpBuffer3d>0&&(grounded||p._coyote3d>0)){p._verticalVelocity=Math.max(0,n(cfg.jumpForce,5.6));p._jumpBuffer3d=0;p._coyote3d=0;p.grounded3d=false;delete p._support3d}
 const steps=Math.max(1,Math.ceil(frame/(1/90))),t=frame/steps,stepHeight=clamp(n(cfg.stepHeight,.28),0,.6),gravity=Math.max(0,n(cfg.gravity,15));
 for(let i=0;i<steps;i++){
  const supported=(p.elevation3d<=.0001||!!supportBody3d(p,entities))&&p._verticalVelocity<=0;
  for(const [axis,delta] of [['x',movement.x*speed*t],['y',movement.z*speed*t]]){
   if(!delta)continue;const before={x:p.x,y:p.y,z:p.elevation3d},result=moveBody3d(p,axis==='x'?delta:0,axis==='y'?delta:0,0,entities,{recover:false});
   if(supported&&stepHeight>0&&result[axis==='x'?'blockedX':'blockedY']){
    // Try the whole step from the original position; check headroom on ascent.
    p.x=before.x;p.y=before.y;p.elevation3d=before.z;const rise=moveBody3d(p,0,0,stepHeight*64,entities,{recover:false}),attempt=rise.blockedZ?null:moveBody3d(p,axis==='x'?delta:0,axis==='y'?delta:0,0,entities,{recover:false});
    if(attempt&&!attempt.blockedX&&!attempt.blockedY)moveBody3d(p,0,0,-stepHeight*64,entities,{recover:false});
    else{p.x=before.x;p.y=before.y;p.elevation3d=before.z;moveBody3d(p,axis==='x'?delta:0,axis==='y'?delta:0,0,entities,{recover:false})}
   }
  }
  p._verticalVelocity-=gravity*t;const contact=moveBody3d(p,0,0,p._verticalVelocity*t*64,entities,{recover:false});if(contact.blockedZ)p._verticalVelocity=0;
 }
 const standing=supportBody3d(p,entities);p.grounded3d=(p.elevation3d<=.0001||!!standing)&&p._verticalVelocity<=0;
 p._support3d=p.grounded3d&&standing?{id:standing.id,x:n(standing.x),y:n(standing.y),z:n(standing.elevation3d)}:null;
 p.animation=p.grounded3d?(len?(sprint?'run':'walk'):'idle'):(p._verticalVelocity>0?'jump':'fall');
}
