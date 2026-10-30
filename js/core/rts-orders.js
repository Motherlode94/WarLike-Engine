import {moveHero,heroCenter,heroBox,solidHero3d} from './hero-movement.js';
import {solidCollider2d} from './physics-2d.js';
import {findEnginePath} from './native-3d.js';
import {damage} from './gameplay-components.js';
import {healthOf,sameFaction,hasLineOfSight} from './ai-perception.js';
import {awardExperience,progressionDamageScale} from './rpg-progression.js';
import {emitFx} from './fx-runtime.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const defaultTacticalUnit=()=>({enabled:true,speed:100,attackRange:190,damage:9,attackInterval:.8,followDistance:95,autoAttack:true});
export const isRtsUnit=o=>o?.tacticalUnit?o.tacticalUnit.enabled!==false:Array.isArray(o?.tags)&&o.tags.includes('rts-unit');
export function orderRtsMove(entities,ids,target){
 if(!target||![target.x,target.y].every(Number.isFinite))return 0;const selected=entities.filter(o=>ids.includes(o.id)&&isRtsUnit(o)),columns=Math.ceil(Math.sqrt(selected.length));
 selected.forEach((o,i)=>{const offsetX=(i%columns-(columns-1)/2)*Math.max(42,o.w*1.3),offsetY=(Math.floor(i/columns)-(Math.ceil(selected.length/columns)-1)/2)*Math.max(42,(o.depth3d??o.h)*1.3);o.rtsOrder={type:'move',x:target.x+offsetX,y:target.y+offsetY};delete o._rtsPath});return selected.length;
}
export function orderRtsGroup(entities,ids,type,targetId=null){
 if(!['follow','hold','attack'].includes(type))return 0;const target=entities.find(o=>o.id===targetId);let count=0;
 for(const o of entities){if(!ids.includes(o.id)||!isRtsUnit(o)||healthOf(o)<=0)continue;if(type!=='hold'&&(!target||target===o||healthOf(target)<=0)||type==='attack'&&sameFaction(o,target))continue;o.rtsOrder={type,...(type!=='hold'?{targetId}: {})};delete o._rtsPath;count++}return count;
}
export function updateRtsOrders(entities,dt,playing,{mode='2d',passFriendlyUnits=false}={}){
 if(!playing||!Number.isFinite(dt)||dt<=0)return;const frame=Math.min(dt,.1);
 for(const o of entities){
  if(!isRtsUnit(o)||healthOf(o)<=0||o.sequenceEnabled===false)continue;const cfg=o.tacticalUnit||{},origin=heroCenter(o,mode);o._rtsCooldown=Math.max(0,n(o._rtsCooldown)-frame);
  let order=o.rtsOrder,enemy=null,goal=null,stop=3;
  if(order?.type==='attack'){enemy=entities.find(t=>t.id===order.targetId&&healthOf(t)>0&&!sameFaction(o,t));if(!enemy){delete o.rtsOrder;order=null}}
  if(!enemy&&cfg.autoAttack!==false&&o.tacticalUnit)enemy=entities.filter(t=>t!==o&&(t.ai?.enabled||t.tags?.includes('enemy')||t.tags?.includes('battlefield-soldier'))&&healthOf(t)>0&&!sameFaction(o,t)&&t.sequenceEnabled!==false).map(t=>({t,d:Math.hypot(heroCenter(t,mode).x-origin.x,heroCenter(t,mode).y-origin.y)})).filter(t=>t.d<=Math.max(1,n(cfg.attackRange,190))).sort((a,b)=>a.d-b.d)[0]?.t;
  if(enemy){const at=heroCenter(enemy,mode),distance=Math.hypot(at.x-origin.x,at.y-origin.y,at.z-origin.z),range=Math.max(1,n(cfg.attackRange,190));
   if(distance<=range&&hasLineOfSight(o,enemy,entities)){
    if(o._rtsCooldown===0){const before=healthOf(enemy);if(enemy.tags?.includes('battlefield-soldier'))enemy._battlefieldThreat=o.id;damage(enemy,Math.max(0,n(cfg.damage,9))*progressionDamageScale(o)*(o.heroState?.commandTime>0?1.25:1));o._rtsCooldown=Math.max(.1,n(cfg.attackInterval,.8));o.animation='attack';for(let i=0;i<6;i++)emitFx('electric',{x:origin.x+(at.x-origin.x)*i/6,y:origin.y+(at.y-origin.y)*i/6,z:origin.z+(at.z-origin.z)*i/6},{mode,count:1,color:'#ffdb88',speed:0,lifetime:.15});if(before>0&&healthOf(enemy)<=0){awardExperience(o,30);enemy.animation='death'}}
    continue;
   }if(order?.type==='attack'){goal=at;stop=range*.8}
  }
  if(!goal&&order?.type==='move')goal={x:order.x,y:order.y};
  if(!goal&&order?.type==='follow'){const target=entities.find(t=>t.id===order.targetId&&healthOf(t)>0);if(!target){delete o.rtsOrder;continue}goal=heroCenter(target,mode);stop=Math.max(32,n(cfg.followDistance,95))}
  if(!goal){if(o.animation==='walk'||o.animation==='run')o.animation='idle';continue}
  const distance=Math.hypot(goal.x-origin.x,goal.y-origin.y);if(distance<stop){if(order?.type==='move')delete o.rtsOrder;o.animation='idle';continue}
  // Company squads can pass allied soldiers, while friendly buildings remain solid.
  // Use the same collision set for pathfinding and movement to avoid deadlocks.
  const collisionEntities=passFriendlyUnits?entities.filter(t=>!t.companyUnit||!sameFaction(o,t)):entities;
  const obstacles=collisionEntities.filter(t=>t!==o&&t.id!==order?.targetId&&(passFriendlyUnits||!sameFaction(o,t))&&(mode==='3d'?solidHero3d(t):solidCollider2d(t)));
  let target=goal;
  if(obstacles.length){o._rtsRepath=n(o._rtsRepath)-frame;if(o._rtsRepath<=0||!Array.isArray(o._rtsPath)){
    const start=passFriendlyUnits?origin:{x:o.x,y:o.y},end=passFriendlyUnits?goal:{x:goal.x-o.w/2,y:goal.y-(o.depth3d??o.h)/2};
    o._rtsPath=findEnginePath(start,end,obstacles.map(t=>({...t,h:mode==='3d'?t.depth3d??t.h:t.h})),{cellSize:32,padding:Math.max(o.w,o.depth3d??o.h)*(passFriendlyUnits?.5:.3)+(passFriendlyUnits?4:0),maxNodes:1200});o._rtsRepath=.65}
   const at=passFriendlyUnits?origin:o;
   while(o._rtsPath?.length&&Math.hypot(o._rtsPath[0].x-at.x,o._rtsPath[0].y-at.y)<8)o._rtsPath.shift();if(o._rtsPath?.length){const p=o._rtsPath[0];target=passFriendlyUnits?p:{x:p.x+o.w/2,y:p.y+(mode==='3d'?o.depth3d??o.h:o.h)/2}}else continue;
  }
  const dx=target.x-origin.x,dy=target.y-origin.y,length=Math.hypot(dx,dy)||1,step=Math.min(distance,Math.max(1,n(cfg.speed,n(o.rtsSpeed,n(o.ai?.speed,70))))*frame);moveHero(o,dx/length*step,dy/length*step,0,collisionEntities,mode);o.animation='walk';if(mode==='3d')o.rotation=Math.atan2(-dx,dy)*180/Math.PI;else if(Math.abs(dx)>.01)o.flipX=dx<0;
 }
}
