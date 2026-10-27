import {findEnginePath as findPath} from './native-3d.js';
// Configurable gameplay components. Positions use WarLike's existing 2D ground coordinates.
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultStats=()=>({maxHealth:100,health:100,maxStamina:100,stamina:100,staminaRegen:14});
export const defaultInventory=()=>({capacity:16,items:[],equipment:{weapon:null,armor:null}});
export const defaultAi=()=>({enabled:true,state:'idle',detection:450,attackRange:65,attackDamage:8,attackCooldown:1.2,speed:75,homeX:null,homeY:null,patrolRadius:130,pathfinding:true,requireLineOfSight:false,pathCellSize:48,repathInterval:.75});
export const defaultController=()=>({walkSpeed:4.2,sprintSpeed:7,jumpForce:5.6,gravity:15,dodgeDistance:1.8,dodgeCooldown:.8,staminaCost:20});
export function ensureStats(o){o.stats??=defaultStats();return o.stats}
export function inventoryAdd(o,id,count=1){o.inventory??=defaultInventory();const inv=o.inventory;count=Math.floor(n(count));if(!id||count<=0)return false;const existing=inv.items.find(i=>i.id===id);if(!existing&&inv.items.length>=Math.max(1,n(inv.capacity,16)))return false;if(existing)existing.count+=count;else inv.items.push({id,count});return true}
export function inventoryRemove(o,id,count=1){const item=o.inventory?.items?.find(i=>i.id===id);count=Math.floor(n(count));if(!item||count<=0||item.count<count)return false;item.count-=count;if(item.count===0)o.inventory.items=o.inventory.items.filter(i=>i!==item);return true}
export function equipItem(o,id,slot='weapon'){if(!o.inventory?.items?.some(i=>i.id===id&&i.count>0)||!['weapon','armor'].includes(slot))return false;o.inventory.equipment??={weapon:null,armor:null};o.inventory.equipment[slot]=id;return true}
export function damage(o,amount){const s=ensureStats(o);s.health=clamp(n(s.health,s.maxHealth)-Math.max(0,n(amount)),0,Math.max(1,n(s.maxHealth,100)));o.hp=s.health;return s.health}
export function updateStats(entities,dt){for(const o of entities){if(!o.stats)continue;const s=o.stats;s.stamina=clamp(n(s.stamina)+Math.max(0,n(s.staminaRegen,14))*dt,0,Math.max(1,n(s.maxStamina,100)));}}
export function updateAi(entities,player,dt){
 if(!player||((player.stats?.health??player.hp??100)<=0))return;
 const collision=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const blocked=(o,x,y)=>entities.some(other=>other!==o&&other!==player&&other.collision3d!==false&&(other.solid3d===true||other.type==='object'||other.type==='mesh3d')&&collision({...o,x,y},other));
 for(const e of entities){const ai=e.ai;if(!ai?.enabled||e===player)continue;
  ai.homeX??=e.x;ai.homeY??=e.y;
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy)||.001;
  const hp=e.stats?.health??e.hp??100;
  if(hp<=0){ai.state='dead';ai.visible=false;ai.detected=false;continue}
  const detection=Math.max(0,n(ai.detection,450)),attackRange=Math.max(5,n(ai.attackRange,65));
  // Sight checks account for walls/cover before entering pursuit.
  const visible=dist<=detection&&!entities.some(o=>{
   if(o===e||o===player||o.collision3d===false||!(o.solid3d===true||o.type==='object'||o.type==='mesh3d'))return false;
   const x0=e.x+(e.w||0)*.5,y0=e.y+(e.h||0)*.5,x1=player.x+(player.w||0)*.5,y1=player.y+(player.h||0)*.5;
   let near=0,far=1;
   for(const [start,delta,min,max] of [[x0,x1-x0,o.x,o.x+(o.w||0)],[y0,y1-y0,o.y,o.y+(o.h||0)]]){
    if(Math.abs(delta)<1e-8){if(start<min||start>max)return false;continue}
    const a=(min-start)/delta,b=(max-start)/delta;
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far)return false;
   }
   return near<1&&far>0;
  });
  // Expose genuine perception to the enemy scanner; never reveal a fabricated target.
  ai.visible=visible;
  ai.detected=dist<=detection&&(ai.requireLineOfSight!==true||visible);
  if(ai.detected){ai.lastKnownX=player.x;ai.lastKnownY=player.y;}
  ai.state=(ai.requireLineOfSight===true&&!visible)?'patrol':dist<=attackRange?'attack':dist<=detection?'chase':'patrol';
  const step=Math.max(0,n(ai.speed,75))*dt;
  if(ai.state==='chase'||ai.state==='patrol'){
   let tx=ai.state==='chase'?player.x:ai.homeX+Math.sin((ai.clock??0)*.65+e.id)*Math.max(0,n(ai.patrolRadius,130));
   let ty=ai.state==='chase'?player.y:ai.homeY+Math.cos((ai.clock??0)*.65+e.id)*Math.max(0,n(ai.patrolRadius,130));
   if(ai.state==='chase'&&ai.pathfinding!==false){
    ai.repathTimer=n(ai.repathTimer)-dt;
    if(ai.repathTimer<=0||!Array.isArray(ai.path)){
     const obstacles=entities.filter(o=>o!==e&&o!==player&&o.collision3d!==false&&(o.solid3d===true||o.type==='object'||o.type==='mesh3d'));
     ai.path=findPath({x:e.x,y:e.y},{x:player.x,y:player.y},obstacles,{cellSize:Math.max(24,n(ai.pathCellSize,48)),padding:Math.max(e.w,e.h)*.35,maxNodes:1200});
     ai.repathTimer=Math.max(.2,n(ai.repathInterval,.75));
    }
    while(ai.path?.length&&Math.hypot(ai.path[0].x-e.x,ai.path[0].y-e.y)<Math.max(8,step*1.5))ai.path.shift();
    if(ai.path?.length){tx=ai.path[0].x;ty=ai.path[0].y}
   }
   const length=Math.hypot(tx-e.x,ty-e.y);
   if(length>2){const distanceStep=Math.min(step,length),ux=(tx-e.x)/length,uy=(ty-e.y)/length;const candidates=[[ux,uy],[ux,0],[0,uy],[-uy,ux],[uy,-ux]];for(const [cx,cy] of candidates){const x=e.x+cx*distanceStep,y=e.y+cy*distanceStep;if(!blocked(e,x,y)){e.x=x;e.y=y;break}}}
   e.animation=ai.state==='chase'?'run':'walk';
  }
  ai.clock=n(ai.clock)+dt;ai.cooldown=Math.max(0,n(ai.cooldown)-dt);
  if(ai.state==='attack'&&ai.cooldown===0){
   // Prevent hits through walls or props: sample the line of sight against solid rectangles.
   const obscured=entities.some(o=>{
    if(o===e||o===player||o.collision3d===false||!(o.solid3d===true||o.type==='object'||o.type==='mesh3d'))return false;
    const x0=e.x+e.w*.5,y0=e.y+e.h*.5,x1=player.x+player.w*.5,y1=player.y+player.h*.5;
    const dx=x1-x0,dy=y1-y0;let near=0,far=1;
    for(const [start,delta,min,max] of [[x0,dx,o.x,o.x+o.w],[y0,dy,o.y,o.y+o.h]]){
     if(Math.abs(delta)<1e-8){if(start<min||start>max)return false;continue}
     const first=(min-start)/delta,second=(max-start)/delta;
     near=Math.max(near,Math.min(first,second));far=Math.min(far,Math.max(first,second));
     if(near>far)return false;
    }
    return near<1&&far>0;
   });
   if(!obscured){damage(player,n(ai.attackDamage,8));e.animation='attack'}
   ai.cooldown=Math.max(.1,n(ai.attackCooldown,1.2));
  }
 }
}
export function attack3d(attacker,entities,{range=120,damageAmount=20,arc=1.2}={}){
 const target=entities.filter(e=>e!==attacker&&e.ai?.enabled&&(e.stats?.health??e.hp??100)>0).sort((a,b)=>Math.hypot(a.x-attacker.x,a.y-attacker.y)-Math.hypot(b.x-attacker.x,b.y-attacker.y))[0];
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
