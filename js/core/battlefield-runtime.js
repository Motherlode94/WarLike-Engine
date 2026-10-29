import {healthOf} from './ai-perception.js';
import {setHealth} from './gameplay-components.js';
import {vehicleComponents} from './vehicle-components.js';

// WarLike Front: local Conquest rules. The browser owns this prototype's simulation.
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const bounded=(value,min,max,fallback)=>Math.max(min,Math.min(max,finite(value,fallback)));
export const isBattlefieldSoldier=o=>o?.tags?.includes('battlefield-soldier')===true;
const center=o=>({x:o.x+o.w/2,y:o.y+(o.depth3d??o.h)/2});
let source=null;
export const battlefieldMatch={active:false,elapsed:0,tickets:{1:80,2:80},sectors:[],dead:new Map(),spawns:new Map(),winner:null,ammo:30,reserve:150,reload:0,reloading:false,kills:0,deaths:0,playerId:null};
export function resetBattlefield(entities){
 source=entities;
 const player=entities.find(o=>o.battlefield?.enabled===true&&o.playable3d===true),cfg=player?.battlefield;
 Object.assign(battlefieldMatch,{active:!!cfg,elapsed:0,tickets:{1:bounded(cfg?.tickets,1,10000,80),2:bounded(cfg?.tickets,1,10000,80)},sectors:[],dead:new Map(),spawns:new Map(),winner:null,ammo:30,reserve:150,reload:0,reloading:false,kills:0,deaths:0,playerId:player?.id??null});
 if(!cfg)return;
 battlefieldMatch.sectors=(Array.isArray(cfg.sectors)?cfg.sectors:[]).slice(0,3).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map((p,index)=>({name:['A','B','C'][index],x:p.x,y:p.y,owner:p.owner===1?1:p.owner===2?2:0,progress:p.owner===1?1:p.owner===2?-1:0,contested:false}));
 for(const unit of entities.filter(isBattlefieldSoldier)){
  battlefieldMatch.spawns.set(unit.id,{x:unit.x,y:unit.y,elevation3d:unit.elevation3d||0});
  delete unit._modeEliminated;delete unit._battlefieldThreat;
 }
}
export function consumeBattlefieldShot(player){
 if(!player?.battlefield?.enabled)return true;
 const rt=battlefieldMatch;
 if(!rt.active||rt.playerId!==player.id||rt.winner!==null||rt.dead.has(player.id)||rt.reloading||rt.ammo<=0)return false;
 rt.ammo--;return true;
}
export function startBattlefieldReload(player){
 const rt=battlefieldMatch;if(!player?.battlefield?.enabled||rt.reloading||rt.ammo>=30||rt.reserve<=0||rt.dead.has(player.id)||rt.winner!==null)return false;
 rt.reload=2;rt.reloading=true;return true;
}
export function tickBattlefield(entities,dt,{keys=new Set(),pressedKeys=new Set(),onPlayerRespawn=()=>{}}={}){
 if(source!==entities)resetBattlefield(entities);
 const rt=battlefieldMatch;if(!rt.active||rt.winner!==null||!Number.isFinite(dt)||dt<=0)return;
 const frame=Math.min(dt,.1),player=entities.find(o=>o.id===rt.playerId),cfg=player?.battlefield;
 if(!player||!cfg)return;rt.elapsed+=frame;
 for(const vehicle of entities.filter(o=>o.vehicleConfig?.driveable&&o.stats))if(healthOf(vehicle)<=0)vehicleComponents(vehicle).engine.enabled=false;
 const soldiers=entities.filter(isBattlefieldSoldier);
 for(const unit of soldiers){
  if(healthOf(unit)<=0&&!rt.dead.has(unit.id)){
   rt.dead.set(unit.id,rt.elapsed+bounded(cfg.respawnSeconds,1,30,5));unit._modeEliminated=true;delete unit.rtsOrder;delete unit._rtsPath;
   rt.tickets[unit.team===2?2:1]=Math.max(0,rt.tickets[unit.team===2?2:1]-1);
   if(unit===player){rt.deaths++;rt.reloading=false;rt.reload=0}else if(unit._battlefieldThreat===player.id)rt.kills++;
  }
  if(rt.dead.has(unit.id)&&rt.elapsed>=rt.dead.get(unit.id)){
   const spawn=rt.spawns.get(unit.id);if(spawn)Object.assign(unit,spawn);
   setHealth(unit,unit.stats?.maxHealth||100);unit.animation='idle';unit._verticalVelocity=0;unit._attackCooldown=0;unit._rtsCooldown=0;
   unit._modeEliminated=false;delete unit._battlefieldThreat;rt.dead.delete(unit.id);
   if(unit===player){unit._hiddenInVehicle=false;rt.ammo=30;rt.reserve=150;onPlayerRespawn()}
  }
 }
 const alive=soldiers.filter(o=>!rt.dead.has(o.id)&&healthOf(o)>0&&o.sequenceEnabled!==false);
 const radius=bounded(cfg.captureRadius,30,400,140),captureTime=bounded(cfg.captureSeconds,2,60,7);
 for(const sector of rt.sectors){
  const nearby=alive.filter(o=>{const c=center(o);return Math.abs(finite(o.elevation3d,0))<3&&Math.hypot(c.x-sector.x,c.y-sector.y)<=radius});
  const teams=new Set(nearby.map(o=>o.team===2?2:1));sector.contested=teams.size>1;
  if(teams.size===1){const team=[...teams][0],direction=team===1?1:-1;sector.progress=Math.max(-1,Math.min(1,sector.progress+direction*frame/captureTime));
   if(sector.progress===1)sector.owner=1;else if(sector.progress===-1)sector.owner=2;
   else if(sector.owner===1&&sector.progress<=0||sector.owner===2&&sector.progress>=0)sector.owner=0;
  }
 }
 const owned=team=>rt.sectors.filter(s=>s.owner===team).length,a=owned(1),b=owned(2);
 if(a!==b)rt.tickets[a>b?2:1]=Math.max(0,rt.tickets[a>b?2:1]-frame*.5*Math.abs(a-b));
 if(rt.tickets[1]<=0||rt.tickets[2]<=0||rt.elapsed>=bounded(cfg.timeLimit,30,3600,480)){
  rt.winner=rt.tickets[1]===rt.tickets[2]?0:rt.tickets[1]>rt.tickets[2]?1:2;return;
 }
 // Existing RTS steering supplies A*, collision sweeps and line-of-sight fire.
 for(const bot of alive.filter(o=>o!==player&&o.tacticalUnit)){
  const targets=rt.sectors.filter(s=>s.owner!==bot.team),options=targets.length?targets:rt.sectors;
  if(!options.length)continue;
  const offset=((bot.id%3)-1)*55;
  const goal=[...options].sort((a,b)=>Math.hypot(a.x-bot.x,a.y-bot.y)-Math.hypot(b.x-bot.x,b.y-bot.y))[0];
  if(!bot.rtsOrder||Math.hypot(bot.rtsOrder.x-goal.x-offset,bot.rtsOrder.y-goal.y)>10)
   bot.rtsOrder={type:'move',x:goal.x+offset,y:goal.y+((bot.id%2)-.5)*65};
 }
 if((pressedKeys.has('r')||keys.has('r'))&&!rt.reloading)startBattlefieldReload(player);
 if(rt.reloading){rt.reload=Math.max(0,rt.reload-frame);if(rt.reload===0){const count=Math.min(30-rt.ammo,rt.reserve);rt.ammo+=count;rt.reserve-=count;rt.reloading=false}}
}
