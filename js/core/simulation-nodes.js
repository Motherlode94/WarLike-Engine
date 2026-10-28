import {awardExperience} from './rpg-progression.js';
import {heroCenter} from './hero-movement.js';
import {emitFx} from './fx-runtime.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const defaultSimulationNode=()=>({enabled:true,kind:'destructible',network:'city',health:100,maxHealth:100,output:8,demand:3,priority:1,repairCost:2,resourceYield:3,rescued:false,rewarded:false});
export function updateSimulationNetworks(entities){
 const networks=new Map();
 for(const o of entities){const c=o.simulationNode;if(!c?.enabled)continue;const key=String(c.network||'city');if(!networks.has(key))networks.set(key,{capacity:0,demand:0,remaining:0,consumers:[]});const net=networks.get(key);c.health=Math.max(0,Math.min(Math.max(1,n(c.maxHealth,100)),n(c.health,100)));
  if(c.kind==='generator'&&c.health>0)net.capacity+=Math.max(0,n(c.output,8))*c.health/Math.max(1,n(c.maxHealth,100));
  if(c.kind==='consumer'){net.demand+=Math.max(0,n(c.demand,3));net.consumers.push(o)}
 }
 for(const net of networks.values()){net.remaining=net.capacity;net.consumers.sort((a,b)=>n(b.simulationNode.priority)-n(a.simulationNode.priority)||n(a.id)-n(b.id));for(const o of net.consumers){const c=o.simulationNode,demand=Math.max(0,n(c.demand,3));c.powered=c.health>0&&net.remaining+1e-6>=demand;if(c.powered)net.remaining-=demand}}
 return networks;
}
export function damageSimulationNode(o,amount,source,{mode='2d'}={}){
 const c=o?.simulationNode;if(!c?.enabled||c.kind!=='destructible'||n(c.health,100)<=0)return false;
 c.health=Math.max(0,n(c.health,100)-Math.max(0,n(amount)));if(c.health>0)return false;
 o._simBefore??={visible:o.visible!==false,collision:o.collision3d!==false,collider:o.collider2d?.enabled!==false};c.destroyed=true;o.visible=false;o.collision3d=false;if(o.collider2d)o.collider2d.enabled=false;
 emitFx('fire',heroCenter(o,mode),{mode,count:28,scale:1.2,ring:true,shake:.2});
 if(!c.rewarded&&source){source.heroState??={};source.heroState.materials=Math.max(0,n(source.heroState.materials))+Math.max(0,Math.floor(n(c.resourceYield,3)));awardExperience(source,20);c.rewarded=true}return true;
}
export function interactSimulationNode(actor,target,{mode='2d'}={}){
 const c=target?.simulationNode;if(!actor||!c?.enabled)return {ok:false,reason:'Aucune interaction.'};const a=heroCenter(actor,mode),b=heroCenter(target,mode);if(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>125)return {ok:false,reason:'Approche-toi pour interagir.'};
 actor.heroState??={};const state=actor.heroState;
 if(c.kind==='civilian'){if(c.rescued)return {ok:false,reason:'Ce civil est déjà en sécurité.'};c.rescued=true;state.rescues=Math.max(0,n(state.rescues))+1;state.reputation=Math.max(0,n(state.reputation))+2;awardExperience(actor,40);emitFx('heal',b,{mode,count:24,ring:true});target.animation='victory';return {ok:true,reason:'Civil secouru · +40 XP · réputation +2'}}
 if(n(c.health,100)>=n(c.maxHealth,100))return {ok:false,reason:c.kind==='consumer'?(c.powered?'Station alimentée.':'Cette station manque de puissance.'): 'Installation déjà en bon état.'};
 const cost=Math.max(0,Math.floor(n(c.repairCost,2)));if(n(state.materials)<cost)return {ok:false,reason:'Réparation : '+cost+' matériaux requis.'};state.materials=Math.max(0,n(state.materials)-cost);c.health=Math.min(Math.max(1,n(c.maxHealth,100)),n(c.health)+50);
 if(c.destroyed){c.destroyed=false;target.visible=target._simBefore?.visible??true;target.collision3d=target._simBefore?.collision??true;if(target.collider2d)target.collider2d.enabled=target._simBefore?.collider??true}
 if(!c.repairRewarded&&c.health>=c.maxHealth){awardExperience(actor,35);c.repairRewarded=true}emitFx('heal',b,{mode,count:18,ring:true});return {ok:true,reason:'Réparation +50 · −'+cost+' matériaux'};
}
