// Configurable gameplay components. Positions use WarLike's existing 2D ground coordinates.
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const defaultStats=()=>({maxHealth:100,health:100,maxStamina:100,stamina:100,staminaRegen:14});
export const defaultInventory=()=>({capacity:16,items:[],equipment:{weapon:null,armor:null}});
export const defaultAi=()=>({enabled:true,state:'idle',detection:450,attackRange:65,attackDamage:8,attackCooldown:1.2,speed:75,homeX:null,homeY:null,patrolRadius:130});
export const defaultController=()=>({walkSpeed:4.2,sprintSpeed:7,jumpForce:5.6,gravity:15,dodgeDistance:1.8,dodgeCooldown:.8,staminaCost:20});
export function ensureStats(o){o.stats??=defaultStats();return o.stats}
export function inventoryAdd(o,id,count=1){o.inventory??=defaultInventory();const inv=o.inventory;count=Math.floor(n(count));if(!id||count<=0)return false;const existing=inv.items.find(i=>i.id===id);if(!existing&&inv.items.length>=Math.max(1,n(inv.capacity,16)))return false;if(existing)existing.count+=count;else inv.items.push({id,count});return true}
export function inventoryRemove(o,id,count=1){const item=o.inventory?.items?.find(i=>i.id===id);count=Math.floor(n(count));if(!item||count<=0||item.count<count)return false;item.count-=count;if(item.count===0)o.inventory.items=o.inventory.items.filter(i=>i!==item);return true}
export function equipItem(o,id,slot='weapon'){if(!o.inventory?.items?.some(i=>i.id===id&&i.count>0)||!['weapon','armor'].includes(slot))return false;o.inventory.equipment??={weapon:null,armor:null};o.inventory.equipment[slot]=id;return true}
export function damage(o,amount){const s=ensureStats(o);s.health=clamp(n(s.health,s.maxHealth)-Math.max(0,n(amount)),0,Math.max(1,n(s.maxHealth,100)));o.hp=s.health;return s.health}
export function updateStats(entities,dt){for(const o of entities){if(!o.stats)continue;const s=o.stats;s.stamina=clamp(n(s.stamina)+Math.max(0,n(s.staminaRegen,14))*dt,0,Math.max(1,n(s.maxStamina,100)));}}
export function updateAi(entities,player,dt){
 if(!player)return;
 const collision=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(const e of entities){const ai=e.ai;if(!ai?.enabled||e===player)continue;
  ai.homeX??=e.x;ai.homeY??=e.y;
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy)||.001;
  const hp=e.stats?.health??e.hp??100;
  if(hp<=0){ai.state='dead';continue}
  const detection=Math.max(0,n(ai.detection,450)),attackRange=Math.max(5,n(ai.attackRange,65));
  ai.state=dist<=attackRange?'attack':dist<=detection?'chase':'patrol';
  const step=Math.max(0,n(ai.speed,75))*dt;
  if(ai.state==='chase'||ai.state==='patrol'){
   const tx=ai.state==='chase'?player.x:ai.homeX+Math.sin((ai.clock??0)*.65+e.id)*Math.max(0,n(ai.patrolRadius,130));
   const ty=ai.state==='chase'?player.y:ai.homeY+Math.cos((ai.clock??0)*.65+e.id)*Math.max(0,n(ai.patrolRadius,130));
   const length=Math.hypot(tx-e.x,ty-e.y);
   if(length>2){const ox=e.x,oy=e.y;e.x+=(tx-e.x)/length*Math.min(step,length);e.y+=(ty-e.y)/length*Math.min(step,length);if(entities.some(other=>other!==e&&other!==player&&other.collision3d!==false&&other.solid3d===true&&collision(e,other))){e.x=ox;e.y=oy}}
   e.animation=ai.state==='chase'?'run':'walk';
  }
  ai.clock=n(ai.clock)+dt;ai.cooldown=Math.max(0,n(ai.cooldown)-dt);
  if(ai.state==='attack'&&ai.cooldown===0){damage(player,n(ai.attackDamage,8));ai.cooldown=Math.max(.1,n(ai.attackCooldown,1.2));e.animation='attack'}
 }
}
export function updateController3d(p,keys,dt,yaw,entities){
 const cfg=p.controller3d||defaultController(),s=ensureStats(p);
 const axisX=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'));
 const axisY=Number(keys.has('w')||keys.has('z')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
 const len=Math.hypot(axisX,axisY);
 const sprint=keys.has('shift')&&s.stamina>0;
 p._dodgeTimer=Math.max(0,n(p._dodgeTimer)-dt);
 const dodgeDown=keys.has('control');
 const dodgeReady=dodgeDown&&!p._dodgeHeld&&p._dodgeTimer===0&&len>0&&s.stamina>=Math.max(0,n(cfg.staminaCost,20));
 p._dodgeHeld=dodgeDown;
 if(dodgeReady){p._dodgeTimer=Math.max(.1,n(cfg.dodgeCooldown,.8));p._dodgeBoost=Math.max(0,n(cfg.dodgeDistance,1.8))*64/.18;s.stamina=Math.max(0,s.stamina-Math.max(0,n(cfg.staminaCost,20)))}
 const dodgeBoost=p._dodgeBoost&&p._dodgeTimer>Math.max(0,n(cfg.dodgeCooldown,.8))-.18?p._dodgeBoost:0;
 const speed=(Math.max(0,n(sprint?cfg.sprintSpeed:cfg.walkSpeed,4.2))*64+dodgeBoost)*dt/(len||1);
 const vx=(axisX*Math.cos(yaw)+axisY*Math.sin(yaw))*speed;
 const vy=(-axisX*Math.sin(yaw)+axisY*Math.cos(yaw))*speed;
 if(len&&sprint)s.stamina=clamp(s.stamina-18*dt,0,n(s.maxStamina,100));
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const solid=o=>o!==p&&!o.lightType&&!o.audioEnabled&&(o.solid3d===true||o.type==='object'||o.type==='mesh3d'&&o.collision3d!==false);
 const oldX=p.x;p.x+=vx;if(entities.some(o=>solid(o)&&overlaps(p,o)))p.x=oldX;
 const oldY=p.y;p.y+=vy;if(entities.some(o=>solid(o)&&overlaps(p,o)))p.y=oldY;
 p._verticalVelocity=n(p._verticalVelocity);
 const ground=0;
 if(keys.has(' ')&&n(p.elevation3d)<=ground+.01&&p._verticalVelocity<=0)p._verticalVelocity=Math.max(0,n(cfg.jumpForce,5.6));
 p._verticalVelocity-=Math.max(0,n(cfg.gravity,15))*dt;
 p.elevation3d=Math.max(ground,n(p.elevation3d)+p._verticalVelocity*dt);
 if(p.elevation3d===ground)p._verticalVelocity=0;
 p.animation=len?(sprint?'run':'walk'):'idle';
}
