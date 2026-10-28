import {noteAnimatorAction,defaultAnimatorGraph} from './animator-graph.js';
import {damage,ensureStats,setHealth} from './gameplay-components.js';
import {healthOf,sameFaction,isHostileTo} from './ai-perception.js';
import {defaultRpgProgression,awardExperience,upgradeHeroSkill,progressionDamageScale,skillRank} from './rpg-progression.js';
import {heroCenter,heroBox,heroFacing,moveHero,segmentBoxFraction,solidHero3d} from './hero-movement.js';
import {solidCollider2d} from './physics-2d.js';
import {emitFx,tickFxRuntime,resetFxRuntime} from './fx-runtime.js';
import {damageSimulationNode,interactSimulationNode,updateSimulationNetworks} from './simulation-nodes.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const heroArchetypes={
 guardian:{name:'Gardien',color:'#64e9ff',damage:28,shieldCapacity:100,dashDistance:190,maxEnergy:110,energyRegen:12,flightSpeed:6},
 speedster:{name:'Vélociste',color:'#ffd16a',damage:24,shieldCapacity:50,dashDistance:340,maxEnergy:90,energyRegen:17,flightSpeed:9},
 arcane:{name:'Arcaniste',color:'#c396ff',damage:36,shieldCapacity:70,dashDistance:220,maxEnergy:140,energyRegen:15,flightSpeed:6},
 tech:{name:'Technologue',color:'#7affbb',damage:30,shieldCapacity:80,dashDistance:230,maxEnergy:120,energyRegen:13,flightSpeed:7}
};
export const heroAbilities={bolt:{name:'Trait d’énergie',cost:12,cooldown:.45},nova:{name:'Onde de choc',cost:30,cooldown:4},dash:{name:'Ruée',cost:18,cooldown:1.5},shield:{name:'Bouclier',cost:25,cooldown:7},flight:{name:'Vol',cost:8,cooldown:.5},rally:{name:'Ralliement',cost:35,cooldown:9}};
export function defaultSuperhero(archetype='guardian'){const preset=Object.hasOwn(heroArchetypes,archetype)?heroArchetypes[archetype]:heroArchetypes.guardian;return {enabled:true,archetype:Object.hasOwn(heroArchetypes,archetype)?archetype:'guardian',...preset,range:640,novaRadius:160,cooldownScale:1,shieldDuration:5,startingMaterials:4,aimAssist:true,slots:['bolt','nova','dash','shield','flight','rally']}}
export function ensureHeroState(o){const cfg=o.superhero||defaultSuperhero();o.heroState??={};const s=o.heroState;s.energy=clamp(n(s.energy,n(cfg.maxEnergy,100)),0,Math.max(1,n(cfg.maxEnergy,100)));s.materials=Math.max(0,Math.floor(n(s.materials,n(cfg.startingMaterials,4))));s.cooldowns=s.cooldowns&&typeof s.cooldowns==='object'&&!Array.isArray(s.cooldowns)?s.cooldowns:{};s.shield=Math.max(0,n(s.shield));s.shieldTime=Math.max(0,n(s.shieldTime));s.combo=Math.max(0,n(s.combo));s.comboTime=Math.max(0,n(s.comboTime));s.commandTime=Math.max(0,n(s.commandTime));s.invulnerable=Math.max(0,n(s.invulnerable));return s}
export const heroRuntime={bolts:[],pressed:new Set(),message:'',messageTime:0,networks:new Map(),casts:0};
export function resetHeroRuntime(){heroRuntime.bolts.length=0;heroRuntime.pressed.clear();heroRuntime.message='';heroRuntime.messageTime=0;heroRuntime.networks=new Map();heroRuntime.casts=0;heroRuntime.currentPlayer=null;heroRuntime.sceneId=null;resetFxRuntime()}
const notify=message=>{heroRuntime.message=String(message).slice(0,180);heroRuntime.messageTime=2.4};
const enemy=(o,source)=>o!==source&&o.sequenceEnabled!==false&&!o._sequenceDestroyed&&!o._modeEliminated&&healthOf(o)>0&&(o.ai?.enabled||o.tags?.includes('enemy'))&&isHostileTo(o,source,source);
const damageable=(o,source)=>enemy(o,source)||o.simulationNode?.enabled&&o.simulationNode.kind==='destructible'&&n(o.simulationNode.health,100)>0;
function hit(source,target,amount,ctx){
 if(!target||sameFaction(source,target))return false;const before=healthOf(target);
 if(target.simulationNode?.kind==='destructible')damageSimulationNode(target,amount,source,ctx);else if(enemy(target,source)){
  damage(target,amount);target.animation=healthOf(target)>0?'hurt':'death';
  if(before>0&&healthOf(target)<=0&&!target._heroRewarded){awardExperience(source,50);target._heroRewarded=true;source.heroState.energy=Math.min(n(source.superhero.maxEnergy,100),source.heroState.energy+8)}
 }else return false;
 const s=ensureHeroState(source);s.combo=Math.min(5,s.combo+1);s.comboTime=2.5;emitFx('electric',heroCenter(target,ctx.mode),{mode:ctx.mode,color:source.superhero.color,count:15,scale:.8,ring:true,lifetime:.3,shake:.08});return true;
}
function aim(source,ctx){
 const origin=heroCenter(source,ctx.mode),fallback=heroFacing(source,ctx.mode,ctx.yaw);let direction={...fallback};
 if(ctx.mode==='2d'&&ctx.aim&&[ctx.aim.x,ctx.aim.y].every(Number.isFinite)){direction={x:ctx.aim.x-origin.x,y:ctx.aim.y-origin.y,z:0}}
 else if(source.superhero.aimAssist!==false){let best=null,distance=Infinity;for(const target of ctx.entities){if(!enemy(target,source))continue;const c=heroCenter(target,ctx.mode),dx=c.x-origin.x,dy=c.y-origin.y,dz=c.z-origin.z,length=Math.hypot(dx,dy,dz);if(length>0&&length<n(source.superhero.range,640)&&length<distance&&(dx*fallback.x+dy*fallback.y)/Math.max(1,Math.hypot(dx,dy))>.72){best={x:dx,y:dy,z:dz};distance=length}}if(best)direction=best}
 const length=Math.hypot(direction.x,direction.y,direction.z)||1;return {x:direction.x/length,y:direction.y/length,z:direction.z/length};
}
export function castHeroPower(source,power,context={}){
 const cfg=source?.superhero,definition=Object.hasOwn(heroAbilities,power)?heroAbilities[power]:null;if(!cfg||cfg.enabled===false||!definition||healthOf(source)<=0)return {ok:false,reason:'Pouvoir indisponible.'};
 const ctx={entities:[],mode:source.type==='mesh3d'?'3d':'2d',...context},s=ensureHeroState(source);
 if(source._hiddenInVehicle||source._hiddenInHouse)return {ok:false,reason:'Sors du véhicule ou du bâtiment.'};
 if(power==='flight'&&s.flight){s.flight=false;notify('Vol désactivé');return {ok:true}}
 if(n(s.cooldowns[power])>0)return {ok:false,reason:'Pouvoir en recharge.'};if(s.energy<definition.cost){notify('Énergie insuffisante');return {ok:false,reason:'Énergie insuffisante.'}}
 s.energy-=definition.cost;s.cooldowns[power]=definition.cooldown*clamp(n(cfg.cooldownScale,1),.15,4);heroRuntime.casts++;
 const origin=heroCenter(source,ctx.mode),direction=aim(source,ctx),amount=Math.max(1,n(cfg.damage,28))*progressionDamageScale(source)*(1+Math.min(5,s.combo)*.035),color=cfg.color;
 if(power==='bolt'){
  if(heroRuntime.bolts.length>=96)heroRuntime.bolts.shift();heroRuntime.bolts.push({owner:source.id,mode:ctx.mode,...origin,direction,speed:800,remaining:clamp(n(cfg.range,640),64,3000),damage:amount,color});emitFx('energy',origin,{mode:ctx.mode,color,count:6,lifetime:.2,speed:10});source.animation='attack';
 }else if(power==='nova'){
  const radius=clamp(n(cfg.novaRadius,160),32,640);emitFx('energy',origin,{mode:ctx.mode,color,count:48,scale:radius/64,lifetime:.7,ring:true,shake:.3});
  for(const target of ctx.entities){if(target===source||sameFaction(source,target))continue;const c=heroCenter(target,ctx.mode),distance=Math.hypot(c.x-origin.x,c.y-origin.y,c.z-origin.z);if(distance>radius)continue;
   if(damageable(target,source))hit(source,target,amount*1.65,ctx);
   const length=Math.hypot(c.x-origin.x,c.y-origin.y)||1,push=(1-distance/radius)*100;
   if(target.rigidbody3d?.enabled){target.rigidbody3d.vx=n(target.rigidbody3d.vx)+(c.x-origin.x)/length*push;target.rigidbody3d.vz=n(target.rigidbody3d.vz)+(c.y-origin.y)/length*push;target.rigidbody3d.vy=n(target.rigidbody3d.vy)+2}
   else if(target.rigidbody2d?.enabled){target.rigidbody2d.vx=n(target.rigidbody2d.vx)+(c.x-origin.x)/length*push;target.rigidbody2d.vy=n(target.rigidbody2d.vy)-160}
  }
 }else if(power==='dash'){
  const start={...origin};moveHero(source,direction.x*clamp(n(cfg.dashDistance,220),32,640),direction.y*clamp(n(cfg.dashDistance,220),32,640),0,ctx.entities,ctx.mode);const end=heroCenter(source,ctx.mode);for(let i=0;i<12;i++)emitFx('electric',{x:start.x+(end.x-start.x)*i/12,y:start.y+(end.y-start.y)*i/12,z:start.z+(end.z-start.z)*i/12},{mode:ctx.mode,color,count:3,speed:10,lifetime:.4});s.invulnerable=.18;
 }else if(power==='shield'){s.shield=Math.max(1,n(cfg.shieldCapacity,80))*(1+skillRank(source,'guard')*.18);s.shieldTime=clamp(n(cfg.shieldDuration,5),1,30);emitFx('energy',origin,{mode:ctx.mode,color,count:22,ring:true,scale:.8})}
 else if(power==='flight'){s.flight=true;source._verticalVelocity=0;if(source.rigidbody2d)source.rigidbody2d.vy=0;emitFx('fire',origin,{mode:ctx.mode,color,count:22,ring:true,scale:.7})}
 else if(power==='rally'){
  const radius=clamp(n(cfg.novaRadius,160)*2,100,800);let count=0;for(const ally of ctx.entities){if(ally===source||!sameFaction(source,ally)||healthOf(ally)<=0)continue;const p=heroCenter(ally,ctx.mode);if(Math.hypot(p.x-origin.x,p.y-origin.y,p.z-origin.z)>radius)continue;
   const stats=ensureStats(ally);setHealth(ally,stats.health+25+skillRank(source,'command')*5);ally.heroState??={};ally.heroState.shield=Math.max(n(ally.heroState.shield),20);ally.heroState.shieldTime=5;ally.heroState.commandTime=6+skillRank(source,'command');if(ally.tacticalUnit?.enabled||ally.tags?.includes('rts-unit'))ally.rtsOrder={type:'follow',targetId:source.id};emitFx('heal',p,{mode:ctx.mode,count:12,ring:true});count++;
  }emitFx('heal',origin,{mode:ctx.mode,count:24,ring:true,scale:radius/64});notify('Ralliement · '+count+' allié(s) soutenu(s)');
 }
 noteAnimatorAction(source,power,power==='dash'?.25:.55);const extra=cfg.fxOverrides?.[power];if(extra)emitFx(extra.kind||'energy',heroCenter(source,ctx.mode),{...extra,count:Math.max(8,Math.min(80,Number(extra.rate)||24)),mode:ctx.mode,ownerId:source.id});
 heroRuntime.onPower?.(power);if(power!=='rally')notify(definition.name);return {ok:true,power};
}
export function tickHeroRuntime(entities,player,dt,context={}){
 const frame=clamp(n(dt),0,.1);if(!frame)return;const ctx={mode:'2d',keys:new Set(),inputBlocked:false,...context,entities};if(heroRuntime.currentPlayer&&player&&heroRuntime.currentPlayer!==player||ctx.sceneId&&heroRuntime.sceneId&&ctx.sceneId!==heroRuntime.sceneId){heroRuntime.bolts=[];heroRuntime.pressed.clear();resetFxRuntime()}heroRuntime.currentPlayer=player;heroRuntime.sceneId=ctx.sceneId||heroRuntime.sceneId;heroRuntime.networks=updateSimulationNetworks(entities);heroRuntime.messageTime=Math.max(0,heroRuntime.messageTime-frame);
 for(const o of entities){
  if(o.heroState){const s=o.heroState;for(const key of ['shieldTime','commandTime','comboTime','invulnerable'])s[key]=Math.max(0,n(s[key])-frame);if(!s.shieldTime)s.shield=0;if(!s.comboTime)s.combo=0}
  if(!o.superhero||o.superhero.enabled===false){if(o.heroState)o.heroState.flight=false;continue}const s=ensureHeroState(o),cfg=o.superhero;for(const key of Object.keys(s.cooldowns))s.cooldowns[key]=Math.max(0,n(s.cooldowns[key])-frame);
  if(healthOf(o)<=0||o._hiddenInVehicle||o._hiddenInHouse){s.flight=false;if(healthOf(o)<=0)s.shield=0;continue}
  const origin=heroCenter(o,ctx.mode),station=entities.some(e=>e.simulationNode?.enabled&&e.simulationNode.kind==='consumer'&&e.simulationNode.powered&&Math.hypot(heroCenter(e,ctx.mode).x-origin.x,heroCenter(e,ctx.mode).y-origin.y)<160);
  s.energy=clamp(s.energy+((s.flight?-10*((o._netKeys||ctx.keys).has('shift')?1.5:1):Math.max(0,n(cfg.energyRegen,12)))+(station?8:0))*frame,0,Math.max(1,n(cfg.maxEnergy,100)));if(s.energy<=0&&s.flight){s.flight=false;notify('Énergie épuisée · vol interrompu')}
  if(o._heroShieldImpact){emitFx('electric',origin,{mode:ctx.mode,color:'#e5faff',count:10,lifetime:.2});delete o._heroShieldImpact}
  if(s.flight||s.shield>0){o._heroAura=n(o._heroAura)+frame;if(o._heroAura>.12){o._heroAura=0;emitFx(s.flight?'fire':'energy',s.flight?{...origin,y:ctx.mode==='2d'?origin.y+n(o.h)*.4:origin.y,z:ctx.mode==='3d'?n(o.elevation3d)*64+3:origin.z}:origin,{mode:ctx.mode,color:cfg.color,count:3,scale:.6,lifetime:.3,speed:s.flight?15:35,ring:s.shield>0})}}
 }
 if(player?.superhero?.enabled!==false&&player?.superhero&&!ctx.inputBlocked){
  const keys=ctx.keys;for(let i=0;i<6;i++){const key=String(i+1);if(ctx.pressedKeys?.has(key)||keys.has(key)&&!heroRuntime.pressed.has(key))castHeroPower(player,(player.superhero.slots||Object.keys(heroAbilities))[i],ctx)}
 }
 if(player&&!ctx.inputBlocked&&healthOf(player)>0){const keys=ctx.keys;
  if((ctx.pressedKeys?.has('u')||keys.has('u')&&!heroRuntime.pressed.has('u'))&&player.rpgProgression)notify(upgradeHeroSkill(player,player.rpgProgression?.trainingFocus||'power')?'Compétence améliorée':'Aucun point disponible ou rang maximum');
  if(ctx.pressedKeys?.has('e')||keys.has('e')&&!heroRuntime.pressed.has('e')){const a=heroCenter(player,ctx.mode),target=entities.filter(e=>e.simulationNode?.enabled&&e!==player).sort((a1,b1)=>{const a2=heroCenter(a1,ctx.mode),b2=heroCenter(b1,ctx.mode);return Math.hypot(a2.x-a.x,a2.y-a.y,a2.z-a.z)-Math.hypot(b2.x-a.x,b2.y-a.y,b2.z-a.z)})[0];if(target){const result=interactSimulationNode(player,target,ctx);notify(result.reason)}}
 }
 heroRuntime.pressed=new Set(ctx.inputBlocked?[]:ctx.keys);
 const pending=[];for(const bolt of heroRuntime.bolts){if(bolt.mode!==ctx.mode)continue;const owner=entities.find(e=>e.id===bolt.owner);if(!owner||!owner.superhero||healthOf(owner)<=0)continue;const distance=Math.min(bolt.remaining,bolt.speed*frame),from={x:bolt.x,y:bolt.y,z:bolt.z},to={x:bolt.x+bolt.direction.x*distance,y:bolt.y+bolt.direction.y*distance,z:bolt.z+bolt.direction.z*distance};let nearest=null,fraction=Infinity;
  for(const target of entities){if(target===owner||target.visible===false||target.sequenceEnabled===false||sameFaction(owner,target))continue;const blocks=ctx.mode==='3d'?solidHero3d(target):solidCollider2d(target);if(!blocks&&!damageable(target,owner))continue;const t=segmentBoxFraction(from,to,heroBox(target,ctx.mode),ctx.mode,2);if(t!==null&&t<fraction){nearest=target;fraction=t}}
  if(nearest){const at={x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction,z:from.z+(to.z-from.z)*fraction};hit(owner,nearest,bolt.damage,ctx);emitFx('electric',at,{mode:ctx.mode,color:bolt.color,count:12,lifetime:.25});continue}
  Object.assign(bolt,to);bolt.remaining-=distance;emitFx('energy',to,{mode:ctx.mode,color:bolt.color,count:1,speed:0,lifetime:.15,scale:1.1});if(bolt.remaining>0&&bolt.z>=0)pending.push(bolt);
 }heroRuntime.bolts=pending;tickFxRuntime(entities,frame,ctx.mode);
}
export function attachHero(o,archetype='guardian'){o.superhero=defaultSuperhero(archetype);o.rpgProgression??=defaultRpgProgression();o.animatorGraph??=defaultAnimatorGraph();ensureStats(o);delete o.heroState;return o}
