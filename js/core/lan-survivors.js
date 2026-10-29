import {ensureSurvival} from './survival-runtime.js';
import {sceneCompanion} from './scene-progress.js';

// A private LAN reclaims saved survivors by displayed name, without accounts.
// Offline companions live in the host's save, outside the simulated scene.
const transient=['_netPeerId','_netRemote','_netKeys','_netFrom','_netTo','_netAt','_support3d','_animatorFrame'];
function cleanCompanion(source){const copy=structuredClone(source);for(const key of transient)delete copy[key];delete copy.survivalCompanions;return copy}
export function reconcileLanSurvivors(entities,players,host,{hostId,allocateId}){
 host._netPeerId=hostId;host.survivalCompanions??=[];
 const guests=players.filter(p=>p.id!==hostId),active=new Set(guests.map(p=>p.id));
 for(let i=entities.length-1;i>=0;i--){
  const o=entities[i];if(o===host||(!o.coopSeat&&!o._netRemote)||active.has(o._netPeerId))continue;
  const copy=cleanCompanion(o);copy.coopName??=copy.name;
  host.survivalCompanions.push(copy);entities.splice(i,1);
 }
 for(const peer of guests){
  if(entities.some(o=>o._netPeerId===peer.id))continue;
  const seat=[1,2,3].find(value=>!entities.some(o=>o.coopSeat===value));if(!seat||entities.length>=256)continue;
  const index=host.survivalCompanions.findIndex(o=>o.coopName===peer.name);
  let survivor=index>=0?host.survivalCompanions.splice(index,1)[0]:null;
  if(survivor&&host.adventure){survivor=sceneCompanion(host,survivor);survivor.x=host.x+65*seat;survivor.y=host.y+45*seat}
  if(!survivor){
   survivor=cleanCompanion(host);
   for(const key of Object.keys(survivor))if(key.startsWith('_')||['sequence','sequences','ai','heroState','survivalState','survivalWorld'].includes(key))delete survivor[key];
   survivor.inventory={capacity:host.inventory?.capacity||24,items:structuredClone(host.survival?.startInventory||(host.survival?[{id:'water',count:1},{id:'berries',count:1}]:host.adventure?.startInventory||[])),equipment:{}};
   if(survivor.stats){survivor.stats.health=survivor.stats.maxHealth||100;survivor.stats.stamina=survivor.stats.maxStamina||100}
   survivor.x+=80*seat;survivor.y+=60;if(survivor.survival)ensureSurvival(survivor);
  }
  survivor.id=allocateId();
  Object.assign(survivor,{coopSeat:seat,coopName:peer.name,name:peer.name,_netPeerId:peer.id,_netRemote:true,_netKeys:new Set(),playable3d:false,survivalDormant:false,visible:true,_modeEliminated:false});
  entities.push(survivor);
 }
 return entities;
}
